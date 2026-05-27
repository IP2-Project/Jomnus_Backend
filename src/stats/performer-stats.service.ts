import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PerformerStats } from './entities/performer-stats.entity';
import { TaskAssignmentEntity, AssignmentStatus } from '@/assignments/entities/assignment.entity';

@Injectable()
export class PerformerStatsService {
  constructor(
    @InjectRepository(PerformerStats)
    private readonly performerRepo: Repository<PerformerStats>,
  ) {}

  async ensure(userId: number) {
    let stats = await this.repo.findOne({ where: { user_id: userId } });
    if (!stats) {
      stats = this.repo.create({
        user_id: userId,
        completed_tasks: 0,
        avg_rating: 0,
        success_rate: 0,
        total_earnings: 0,
        response_time: null,
      });
      stats = await this.repo.save(stats);
    }
    return stats;
  }

  async refresh(userId: number) {
    await this.ensure(userId);

    // Fetch metrics directly linked to this performer
    const result = await this.repo.manager
      .getRepository(TaskAssignmentEntity)
      .createQueryBuilder('assignment')
      .select('assignment.status', 'status')
      .addSelect('assignment.accepted_price', 'price')
      .where('assignment.performer_id = :userId', { userId })
      .getRawMany();

    // 1. Calculate tasks completed (VERIFIED or COMPLETED states)
    const completedTasks = result.filter(
      (a) => a.status === AssignmentStatus.VERIFIED || a.status === AssignmentStatus.COMPLETED,
    ).length;

    // 2. Calculate Success Rate (completed assignments vs total decided actions)
    const totalDecided = result.filter((a) => a.status !== AssignmentStatus.ASSIGNED).length;
    const successRate = totalDecided > 0 ? Math.round((completedTasks / totalDecided) * 100) : 0;

    // 3. Sum total earnings from finalized verified work items
    const totalEarnings = result
      .filter((a) => a.status === AssignmentStatus.VERIFIED)
      .reduce((sum, a) => sum + parseFloat(a.price || '0'), 0);

    // Save calculation data directly back to the database row
    await this.repo.update(
      { user_id: userId },
      {
        completed_tasks: completedTasks,
        total_earnings: totalEarnings,
        success_rate: successRate,
      },
    );

    console.log(`[Performer Stats Synced] User: ${userId} -> Completed: ${completedTasks}, Earnings: $${totalEarnings}`);
  }

  async incrementCompletedTasks(userId: number) {
    const stats = await this.performerRepo.findOne({
      where: { user_id: userId },
    });

    if (!stats) {
      await this.performerRepo.save({
        user_id: userId,
        completed_tasks: 1,
        avg_rating: 0,
        success_rate: 0,
        total_earnings: 0,
        response_time: null,
      });

      return;
    }

    await this.performerRepo.save(stats);

    console.log("UPDATED COMPLETED TASKS:", stats.completed_tasks);
  }

  async addRating(userId: number, newRating: number) {
    const stats = await this.performerRepo.findOne({
      where: { user_id: userId },
    });

    if (!stats) {
      await this.performerRepo.save({
        user_id: userId,
        completed_tasks: 1,
        avg_rating: newRating,
        success_rate: 100,
        total_earnings: 0,
        response_time: null,
      });

      return;
    }

      const totalTasks = stats.completed_tasks || 0;
      const currentAvg = stats.avg_rating || 0;

      const updatedAvg =
        totalTasks === 0
          ? newRating
          : (currentAvg * totalTasks + newRating) / totalTasks;

      stats.avg_rating = Number(updatedAvg.toFixed(2));

      await this.performerRepo.save(stats);

    console.log("UPDATED RATING:", stats.avg_rating);
  }

  async addEarnings(userId: number, amount: number) {
    const stats = await this.performerRepo.findOne({
      where: { user_id: userId },
    });

    if (!stats) {
      await this.performerRepo.save({
        user_id: userId,
        completed_tasks: 0,
        avg_rating: 0,
        success_rate: 0,
        total_earnings: amount,
        response_time: null,
      });

      return;
    }

    stats.total_earnings += amount;

    await this.performerRepo.save(stats);

    console.log("UPDATED EARNINGS:", stats.total_earnings);
  }

  async updateSuccessRate(userId: number, rate: number) {
    const stats = await this.performerRepo.findOne({
      where: { user_id: userId },
    });

    if (!stats) {
      await this.performerRepo.save({
        user_id: userId,
        completed_tasks: 0,
        avg_rating: 0,
        success_rate: rate,
        total_earnings: 0,
        response_time: null,
      });

      return;
    }

    stats.success_rate = rate;

    await this.performerRepo.save(stats);

    console.log("UPDATED SUCCESS RATE:", stats.success_rate);
  }

}