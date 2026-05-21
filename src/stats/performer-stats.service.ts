import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PerformerStats } from "./entities/performer-stats.entity";
import { UserEntity } from "@/users/entity/user.entity";

@Injectable()
export class PerformerStatsService {
  constructor(
    @InjectRepository(PerformerStats)
    private readonly performerRepo: Repository<PerformerStats>,
  ) {}

  // 🟢 Create initial stats for performer
  async createInitial(user: UserEntity) {
    const existing = await this.performerRepo.findOne({
      where: { user_id: user.id }, // ✅ FIXED
    });

    if (!existing) {
      await this.performerRepo.save(
        this.performerRepo.create({
          user_id: user.id, // ✅ IMPORTANT
          completed_tasks: 0,
          avg_rating: 0,
          success_rate: 0,
          total_earnings: 0,
          response_time: null,
        }),
      );
    }
  }

  // 🟢 Get stats by userId
  async getByUserId(userId: number) {
    return this.performerRepo.findOne({
      where: { user_id: userId }, // ✅ FIXED
      relations: ["user"],
    });
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