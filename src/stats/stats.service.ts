import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { PerformerStats } from './entities/performer-stats.entity';
import { RequesterStats } from './entities/requester-stats.entity';
import { UserEntity } from '@/users/entity/user.entity';

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

  /**
   * Create default stats for newly registered users
   */
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

  /**
   * Get performer statistics
   */
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

  /**
   * Get requester statistics
   */
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

  /**
   * Refresh requester statistics
   */
  async refreshRequesterStats(userId: number) {
    const result = await this.requesterRepo.query(
      `
      SELECT
        COUNT(ta.id)::int AS tasks_verified,
        COALESCE(SUM(ta.accepted_price), 0)::float AS total_spent
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      WHERE t.requester_id = $1
        AND ta.status = 'VERIFIED'
      `,
      [userId],
    );

    const stats = result[0] || {
      tasks_verified: 0,
      total_spent: 0,
    };

    await this.requesterRepo.update(
      { user_id: userId },
      {
        tasks_verified: Number(stats.tasks_verified),
        total_spent: Number(stats.total_spent),
      },
    );

    return stats;
  }

  /**
   * Refresh performer statistics
   */
  async refreshPerformerStats(userId: number) {
    const result = await this.performerRepo.query(
      `
      SELECT
        COUNT(ta.id)::int AS completed_tasks,
        COALESCE(SUM(ta.accepted_price), 0)::float AS total_earnings
      FROM task_assignments ta
      WHERE ta.performer_id = $1
        AND ta.status = 'VERIFIED'
      `,
      [userId],
    );

    const stats = result[0] || {
      completed_tasks: 0,
      total_earnings: 0,
    };

    await this.performerRepo.update(
      { user_id: userId },
      {
        completed_tasks: Number(stats.completed_tasks),
        total_earnings: Number(stats.total_earnings),
      },
    );

    return stats;
  }

  /**
   * Validate user existence
   */
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