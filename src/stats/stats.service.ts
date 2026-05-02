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
    const userId = Number(user.id);

    // 1. Handle Performer Stats
    const existingPerformer = await this.performerRepo.findOne({ 
      where: { user_id: userId } 
    });
    
    if (!existingPerformer) {
      await this.performerRepo.save(this.performerRepo.create({
        user_id: userId,
      }));
    }

    // 2. Handle Requester Stats
    const existingRequester = await this.requesterRepo.findOne({ 
      where: { user_id: userId } 
    });

    if (!existingRequester) {
      await this.requesterRepo.save(this.requesterRepo.create({
        user_id: userId,
      }));
    }
  }
}