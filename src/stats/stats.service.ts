import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm/dist/common/typeorm.decorators";
import { UserProfile } from "./entities/user-profile.entity";
import { Repository } from "typeorm/browser/repository/Repository.js";
import { PerformerStats } from "./entities/performer-stats.entity";
import { RequesterStats } from "./entities/requester-stats.entity";
import { User } from "@/users/entities/user.entity";

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(UserProfile)
    private profileRepo: Repository<UserProfile>,

    @InjectRepository(PerformerStats)
    private performerRepo: Repository<PerformerStats>,

    @InjectRepository(RequesterStats)
    private requesterRepo: Repository<RequesterStats>,
  ) {}

  async createInitialStats(user: User) {
    await this.profileRepo.save({ user });

    await this.performerRepo.save({ user });

    await this.requesterRepo.save({ user });
  }
}