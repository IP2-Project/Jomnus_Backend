import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequesterStats } from './entities/requester-stats.entity';
import { TaskAssignmentEntity, AssignmentStatus } from '@/assignments/entities/assignment.entity';

@Injectable()
export class RequesterStatsService {
  constructor(
    @InjectRepository(RequesterStats)
    private readonly repo: Repository<RequesterStats>,
  ) {}

  async ensure(userId: number) {
    let stats = await this.repo.findOne({ where: { user_id: userId } });
    if (!stats) {
      stats = this.repo.create({
        user_id: userId,
        tasks_posted: 0,
        tasks_verified: 0,
        total_spent: 0,
      });
      stats = await this.repo.save(stats);
    }
    return stats;
  }

  async incrementTaskPosted(userId: number) {
    await this.ensure(userId);
    await this.repo.increment({ user_id: userId }, 'tasks_posted', 1);
  }

  async refresh(userId: number) {
    await this.ensure(userId);

    // 💥 FIX: Explicitly join assignments to tasks using your exact schema refs
    const result = await this.repo.manager
      .getRepository(TaskAssignmentEntity)
      .createQueryBuilder('assignment')
      .innerJoin('assignment.task', 'task') // Follows: Ref: task_assignments.task_id > tasks.id
      .select('COUNT(assignment.id)', 'count')
      .addSelect('SUM(assignment.accepted_price)', 'totalSpent')
      .where('task.requester_id = :userId', { userId }) // Follows: Ref: tasks.requester_id > users.id
      .andWhere('assignment.status = :status', { status: AssignmentStatus.VERIFIED })
      .getRawOne();

    const tasksVerified = parseInt(result?.count || '0', 10);
    const totalSpent = parseFloat(result?.totalSpent || '0');

    // Save calculations cleanly back to your table row
    await this.repo.update(
      { user_id: userId },
      {
        tasks_verified: tasksVerified,
        total_spent: totalSpent,
      },
    );
    
    console.log(`[Requester Stats Synced] User: ${userId} -> Verified: ${tasksVerified}, Spent: $${totalSpent}`);
  }

  async incrementTasksPosted(userId: number) {
  await this.requesterRepo.increment(
    { user_id: userId },
    "tasks_posted",
    1,
  );
}

  async incrementVerifiedTasks(userId: number) {
  await this.requesterRepo.increment(
    { user_id: userId },
    "tasks_verified",
    1,
  );
}

  async addSpent(userId: number, amount: number) {
  if (amount <= 0) return;

  await this.requesterRepo.increment(
    { user_id: userId },
    "total_spent",
    amount,
  );
}

}