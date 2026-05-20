import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PerformerStats } from "./entities/performer-stats.entity";
import { UserEntity } from "@/users/entity/user.entity";

@Injectable()
export class PerformerStatsService {
  constructor(
    @InjectRepository(PerformerStats)
    private readonly repo: Repository<PerformerStats>,
  ) {}

  // 🟢 ENSURE STAT EXISTS (IMPORTANT)
  async ensure(userId: number) {
    let stats = await this.repo.findOne({
      where: { user_id: userId },
    });

    if (!stats) {
      stats = await this.repo.save(
        this.repo.create({
          user_id: userId,
          completed_tasks: 0,
          avg_rating: 0,
          success_rate: 0,
          total_earnings: 0,
          response_time: null,
        }),
      );
    }

    return stats;
  }

  // 🟢 WHEN TASK COMPLETED
  async incrementCompletedTasks(userId: number) {
    await this.ensure(userId);

    await this.repo.increment(
      { user_id: userId },
      "completed_tasks",
      1,
    );
  }

  // ⭐ WHEN SOMEONE RATES WORK
  async addRating(userId: number, newRating: number) {
    const stats = await this.ensure(userId);

    const totalTasks = stats.completed_tasks || 0;

    if (totalTasks === 0) {
      stats.avg_rating = newRating;
    } else {
      stats.avg_rating =
        Number(
          (
            (stats.avg_rating * (totalTasks - 1) + newRating) /
            totalTasks
          ).toFixed(2),
        );
    }

    await this.repo.save(stats);
  }

  // 💰 WHEN PAYMENT COMPLETED
  async addEarnings(userId: number, amount: number) {
    if (amount <= 0) return;

    await this.ensure(userId);

    await this.repo.increment(
      { user_id: userId },
      "total_earnings",
      amount,
    );
  }

  // 📊 SUCCESS RATE (AUTO CALCULATED VERSION)
  async updateSuccessRate(userId: number) {
    const stats = await this.ensure(userId);

    const successRate =
      stats.completed_tasks > 0
        ? 100 // you can improve later with failed tasks tracking
        : 0;

    stats.success_rate = successRate;

    await this.repo.save(stats);
  }

  // ⏱ RESPONSE TIME (simple version)
  async updateResponseTime(userId: number, responseTime: number) {
    await this.ensure(userId);

    await this.repo.update(
      { user_id: userId },
      { response_time: responseTime },
    );
  }

  // 🔍 GET STATS
  async getByUserId(userId: number) {
    return this.repo.findOne({
      where: { user_id: userId },
      relations: ["user"],
    });
  }
}