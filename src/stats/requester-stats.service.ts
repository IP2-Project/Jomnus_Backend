import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RequesterStats } from "./entities/requester-stats.entity";
import { UserEntity } from "@/users/entity/user.entity";

@Injectable()
export class RequesterStatsService {
  updateRequesterStats(requester_id: number) {
      throw new Error('Method not implemented.');
  }
  constructor(
    @InjectRepository(RequesterStats)
    private readonly repo: Repository<RequesterStats>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
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

        tasks_posted: 0,
        tasks_verified: 0,
        total_spent: 0,
      });

      stats = await this.repo.save(stats);
    }
  }

  /**
   * Increment task posted count
   */
  async incrementTaskPosted(userId: number) {
    await this.ensure(userId);

    await this.repo.increment(
      { user_id: userId },
      "tasks_posted",
      1,
    );
  }

  /**
   * Fully recalculate requester stats
   */
  async refresh(userId: number) {
    await this.ensure(userId);

    const result = await this.repo.query(
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

    await this.repo.update(
      { user_id: userId },
      {
        tasks_verified: Number(stats.tasks_verified),
        total_spent: Number(stats.total_spent),
      },
    );

    return stats;
  }

  /**
   * Get requester stats
   */
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