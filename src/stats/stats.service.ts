import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { PerformerStats } from './entities/performer-stats.entity';
import { RequesterStats } from './entities/requester-stats.entity';
import { UserEntity } from '@/users/entity/user.entity';
import { AssignmentStatus, TaskAssignmentEntity } from '@/assignments/entities/assignment.entity';
import { TaskEntity } from '@/tasks/entities/task.entity';
import { Review } from '@/reviews/entities/review.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(PerformerStats)
    private readonly performerRepo: Repository<PerformerStats>,

    @InjectRepository(RequesterStats)
    private readonly requesterRepo: Repository<RequesterStats>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    private readonly dataSource: DataSource,
  ) {}

  async createInitialStats(user: UserEntity) {
    const userId = Number(user.id);

    await this.dataSource.transaction(async (manager) => {
      // Performer Stats
      const performerExists = await manager.exists(PerformerStats, {
        where: { user_id: userId },
      });

      if (!performerExists) {
        const performerStats = manager.create(PerformerStats, {
          user_id: userId,
          user,

          completed_tasks: 0,
          avg_rating: 0,
          success_rate: 0,
          total_earnings: 0,
          response_time: 0,
        });

        await manager.save(performerStats);
      }

      // Requester Stats
      const requesterExists = await manager.exists(RequesterStats, {
        where: { user_id: userId },
      });

      if (!requesterExists) {
        const requesterStats = manager.create(RequesterStats, {
          user_id: userId,
          user,

          tasks_posted: 0,
          tasks_verified: 0,
          total_spent: 0,
        });

        await manager.save(requesterStats);
      }
    });
  }

  async getPerformerStats(userId: string): Promise<PerformerStats> {
    const stats = await this.performerRepo.findOne({
      where: {
        user_id: Number(userId),
      },
      relations: ['user'],
    });

    if (!stats) {
      await this.validateUser(userId);
      throw new NotFoundException('Performer statistics not found');
    }

    return stats;
  }

  async getRequesterStats(userId: string): Promise<RequesterStats> {
    const stats = await this.requesterRepo.findOne({
      where: {
        user_id: Number(userId),
      },
      relations: ['user'],
    });

    if (!stats) {
      await this.validateUser(userId);
      throw new NotFoundException('Requester statistics not found');
    }

    return stats;
  }

  async refreshRequesterStats(userId: number) {
    // Count tasks posted by this requester
    const posted = await this.dataSource
      .getRepository(TaskEntity)
      .createQueryBuilder('t')
      .select('COUNT(t.id)', 'tasks_posted')
      .where('t.requester_id = :userId', { userId })
      .getRawOne();

    const verified = await this.dataSource
      .getRepository(TaskAssignmentEntity)
      .createQueryBuilder('ta')
      .innerJoin('ta.task', 't')
      .select('COALESCE(SUM(ta.accepted_price), 0)', 'total_spent')
      .addSelect('COUNT(ta.id)', 'tasks_verified')
      .where('t.requester_id = :userId', { userId })
      .andWhere('ta.status IN (:...statuses)', { statuses: [AssignmentStatus.VERIFIED, AssignmentStatus.COMPLETED] })
      .getRawOne();

    await this.requesterRepo
      .createQueryBuilder()
      .update(RequesterStats)
      .set({
        tasks_posted: Number(posted.tasks_posted),
        tasks_verified: Number(verified.tasks_verified),
        total_spent: Number(verified.total_spent),
      })
      .where('user_id = :userId', { userId })
      .execute();

    return {
      tasks_posted: Number(posted.tasks_posted),
      tasks_verified: Number(verified.tasks_verified),
      total_spent: Number(verified.total_spent),
    };
  }


  async refreshPerformerStats(userId: number) {
    const stats = await this.dataSource
      .getRepository(TaskAssignmentEntity)
      .createQueryBuilder('ta')
      .select('COUNT(ta.id)', 'completed_tasks')
      .addSelect('COALESCE(SUM(ta.accepted_price), 0)', 'total_earnings')
      .where('ta.performer_id = :userId', { userId })
      .andWhere('ta.status = :status', { status: AssignmentStatus.VERIFIED })
      .getRawOne();

    const totalDecided = await this.dataSource
      .getRepository(TaskAssignmentEntity)
      .createQueryBuilder('ta')
      .select('COUNT(ta.id)', 'decided')
      .where('ta.performer_id = :userId', { userId })
      .andWhere('ta.status != :status', { status: AssignmentStatus.ASSIGNED })
      .getRawOne();

    const ratingResult = await this.dataSource
      .getRepository(Review)
      .createQueryBuilder('r')
      .select('COALESCE(AVG(r.rating), 0)', 'avg_rating')
      .where('r.reviewee_id = :userId', { userId })
      .getRawOne();

    const successRate =
      Number(totalDecided.decided) > 0
        ? Math.round((Number(stats.completed_tasks) / Number(totalDecided.decided)) * 100)
        : 0;

    const responseTimeResult = await this.dataSource
    .getRepository(TaskAssignmentEntity)
    .createQueryBuilder('ta')
    .select(
      `COALESCE(AVG(EXTRACT(EPOCH FROM (ta.verified_at - ta.created_at)) / 60), 0)`,
      'response_time'
    )
    .where('ta.performer_id = :userId', { userId })
    .andWhere('ta.verified_at IS NOT NULL')
    .getRawOne();


    await this.performerRepo
      .createQueryBuilder()
      .update(PerformerStats)
      .set({
        completed_tasks: Number(stats.completed_tasks),
        total_earnings: Number(stats.total_earnings),
        success_rate: successRate,
        avg_rating: Number(Number(ratingResult.avg_rating).toFixed(1)),
        response_time: Math.round(Number(responseTimeResult.response_time)),

      })
      .where('user_id = :userId', { userId })
      .execute();
  }


  async refreshAllStats() {
    const performers = await this.dataSource
      .getRepository(TaskAssignmentEntity)
      .createQueryBuilder('ta')
      .select('DISTINCT ta.performer_id', 'performer_id')
      .getRawMany();

    for (const { performer_id } of performers) {
      await this.refreshPerformerStats(Number(performer_id));
    }

    const requesters = await this.dataSource
      .getRepository(TaskEntity)
      .createQueryBuilder('t')
      .select('DISTINCT t.requester_id', 'requester_id')
      .getRawMany();

    for (const { requester_id } of requesters) {
      await this.refreshRequesterStats(Number(requester_id));
    }
  }

    private async validateUser(userId: string) {
      const user = await this.userRepo.findOneBy({
        id: Number(userId),
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return user;
    }
}