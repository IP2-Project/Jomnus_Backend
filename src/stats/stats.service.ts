import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PerformerStats } from './entities/performer-stats.entity';
import { RequesterStats } from './entities/requester-stats.entity';
import { UserEntity } from '@/users/entity/user.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(PerformerStats)
    private readonly performerRepo: Repository<PerformerStats>,
    @InjectRepository(RequesterStats)
    private readonly requesterRepo: Repository<RequesterStats>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async getPerformerStats(userId: string): Promise<PerformerStats> {
    const stats = await this.performerRepo.findOne({
      where: { user: { id: Number(userId) } },
    });
    
    if (!stats) {
      // Check if user exists to provide a better error message
      await this.validateUser(userId);
      throw new NotFoundException('Performer statistics not found for this user');
    }
    return stats;
  }

  async getRequesterStats(userId: string): Promise<RequesterStats> {
    const stats = await this.requesterRepo.findOne({
      where: { user: { id: Number(userId) } },
    });

    if (!stats) {
      await this.validateUser(userId);
      throw new NotFoundException('Requester statistics not found for this user');
    }
    return stats;
  }

  private async validateUser(userId: string) {
    const user = await this.userRepo.findOneBy({ id: Number(userId) });
    if (!user) throw new NotFoundException('User not found');
  }
}