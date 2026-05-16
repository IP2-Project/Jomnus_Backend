import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RequesterStats } from "./entities/requester-stats.entity";
import { UserEntity } from "@/users/entity/user.entity";

@Injectable()
export class RequesterStatsService {
  constructor(
    @InjectRepository(RequesterStats)
    private readonly requesterRepo: Repository<RequesterStats>,
  ) {}

  // 🟢 Create stats when user is created
  async createInitial(user: UserEntity) {
    const existing = await this.requesterRepo.findOne({
      where: { user_id: user.id }, // ✅ FIXED (use column, not relation)
    });

    if (!existing) {
      await this.requesterRepo.save(
        this.requesterRepo.create({
          user_id: user.id, // ✅ IMPORTANT
          tasks_posted: 0,
          tasks_verified: 0,
          total_spent: 0,
        }),
      );
    }
  }

  // 🟢 Get stats for frontend
  async getByUserId(userId: number) {
    return this.requesterRepo.findOne({
      where: { user_id: userId }, // ✅ FIXED
      relations: ["user"],
    });
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