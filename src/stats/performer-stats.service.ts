import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { PerformerStats } from "./entities/performer-stats.entity";

@Injectable()
export class PerformerStatsService {
  refreshPerformerStats(performer_id: number) {
      throw new Error('Method not implemented.');
  }
  constructor(
    @InjectRepository(PerformerStats)
    private readonly repo: Repository<PerformerStats>,
  ) {}
  

  /**
   * Ensure stats row exists
   */
  async ensure(userId: number) {
    let stats = await this.repo.findOne({
      where: { user_id: userId },
    });

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

  async updatePerformerStats(performerId: number) {
  const result = await this.repo.query(`
    SELECT 
      COUNT(CASE WHEN ta.status = 'COMPLETED' THEN 1 END) AS completed_tasks,
      COUNT(CASE WHEN ta.status = 'VERIFIED' THEN 1 END) AS tasks_verified,
      COALESCE(SUM(CASE WHEN ta.status = 'VERIFIED' THEN ta.accepted_price END), 0) AS total_earned
    FROM "task-assignments" ta
    WHERE ta.performer_id = $1
  `, [performerId]);

  const stats = result[0] || { completed_tasks: 0, total_earnings: 0 };

  await this.repo.update(
    { user_id: performerId },
    {
      completed_tasks: stats.completed_tasks,
      // tasks_verified: stats.tasks_verified,
      total_earnings: stats.total_earnings,
    }
  );
}


  /**
   * Refresh performer statistics
   */
  async refresh(userId: number) {
    await this.ensure(userId);

    const result = await this.repo.query(
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

    const completedTasks = Number(stats.completed_tasks);

    await this.repo
      .createQueryBuilder()
      .update(PerformerStats)
      .set({
        completed_tasks: completedTasks,
        total_earnings: Number(stats.total_earnings),
        success_rate: completedTasks > 0 ? 100 : 0,
      })
      .where("user_id = :userId", { userId: Number(userId) })
      .execute();
  }

  /**
   * Add rating
   */
  async addRating(userId: number, newRating: number) {
    const stats = await this.ensure(userId);

    const completedTasks = stats.completed_tasks || 0;

    if (completedTasks <= 1) {
      stats.avg_rating = newRating;
    } else {
      stats.avg_rating = Number(
        (
          (stats.avg_rating * (completedTasks - 1) +
            newRating) /
          completedTasks
        ).toFixed(2),
      );
    }

    await this.repo.save(stats);
  }

  /**
   * Update response time
   */
  async updateResponseTime(
    userId: number,
    responseTime: number,
  ) {
    await this.ensure(userId);

    await this.repo.update(
      { user_id: userId },
      {
        response_time: responseTime,
      },
    );
  }

  /**
   * Get performer stats
   */
  async getByUserId(userId: number) {
    return this.repo.findOne({
      where: {
        user_id: userId,
      },
      relations: ["user"],
    });
  }
}