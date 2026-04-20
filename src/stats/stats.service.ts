import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { PerformerStats } from "./entities/performer-stats.entity";
import { RequesterStats } from "./entities/requester-stats.entity";
import { UserEntity } from "@/users/entity/user.entity";

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(PerformerStats)
    private performerRepo: Repository<PerformerStats>,

    @InjectRepository(RequesterStats)
    private requesterRepo: Repository<RequesterStats>,
  ) {}

  async createInitialStats(user: UserEntity) {
    await Promise.all([
      this.performerRepo.save({
        user_id: Number(user.id),
      }),
      this.requesterRepo.save({
        user_id: Number(user.id),
      }),
    ]);
  }
}