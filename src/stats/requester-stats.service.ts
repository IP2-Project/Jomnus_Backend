import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RequesterStats } from "./entities/requester-stats.entity";

@Injectable()
export class RequesterStatsService {
  constructor(
    @InjectRepository(RequesterStats)
    private readonly repo: Repository<RequesterStats>,
  ) {}

  // 🟢 Ensure stats row exists
  async ensure(userId: number) {
    let stats = await this.repo.findOne({
      where: { user_id: userId },
    });

    if (!stats) {
      stats = await this.repo.save(
        this.repo.create({
          user_id: userId,
          tasks_posted: 0,
          tasks_verified: 0,
          total_spent: 0,
        }),
      );
    }

    return stats;
  }

  // 🟢 TASK CREATED
  async incrementTaskPosted(userId: number) {
    await this.ensure(userId);

    await this.repo.increment(
      { user_id: userId },
      "tasks_posted",
      1,
    );
  }

  // 🟢 TASK VERIFIED / COMPLETED
  async incrementTaskVerified(userId: number) {
    await this.ensure(userId);

    await this.repo.increment(
      { user_id: userId },
      "tasks_verified",
      1,
    );
  }

  // 🟢 TASK PAYMENT (TOTAL SPENT)
  async addTotalSpent(userId: number, amount: number) {
    if (!amount || amount <= 0) return;

    await this.ensure(userId);

    await this.repo.increment(
      { user_id: userId },
      "total_spent",
      amount,
    );
  }

  // 🟢 GET STATS
  async getByUserId(userId: number) {
    return this.repo.findOne({
      where: { user_id: userId },
      relations: ["user"],
    });
  }
}