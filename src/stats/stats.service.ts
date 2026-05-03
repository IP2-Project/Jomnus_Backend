import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

  /**
   * COMBINED LOGIC: Uses your UserEntity parameter (faster) 
   * but uses Incoming's detailed default values (0s).
   */
  async createInitialStats(user: UserEntity) {
    const userId = Number(user.id);

    // 1. Handle Performer Stats
    const existingPerformer = await this.performerRepo.findOne({ 
      where: { user: { id: userId } } 
    });
    
    if (!existingPerformer) {
      await this.performerRepo.save(this.performerRepo.create({
        user: user,
        completed_tasks: 0,
        avg_rating: 0,
        success_rate: 0,
        total_earnings: 0,
        response_time: 0,
      }));
    }

    // 2. Handle Requester Stats
    const existingRequester = await this.requesterRepo.findOne({ 
      where: { user: { id: userId } } 
    });

    if (!existingRequester) {
      await this.requesterRepo.save(this.requesterRepo.create({
        user: user,
        tasks_posted: 0,
        tasks_verified: 0,
        total_spent: 0,
      }));
    }
  }

  // KEEP THESE: These were in Incoming and are necessary for the Dashboard/Profiles
  async getPerformerStats(userId: string): Promise<PerformerStats> {
    const stats = await this.performerRepo.findOne({
      where: { user: { id: Number(userId) } },
      relations: ['user'],
    });
    
    if (!stats) {
      await this.validateUser(userId);
      throw new NotFoundException('Stats not found');
    }

    if (stats.user.currentRole !== 'PERFORMER') {
      throw new ForbiddenException('User is not currently a Performer');
    }

    return stats;
  }

  async getRequesterStats(userId: string): Promise<RequesterStats> {
    const stats = await this.requesterRepo.findOne({
      where: { user: { id: Number(userId) } },
      relations: ['user'],
    });

    if (!stats) {
      await this.validateUser(userId);
      throw new NotFoundException('Requester statistics not found');
    }

    if (stats.user.currentRole !== 'REQUESTER') {
      throw new ForbiddenException('User is not currently a Requester');
    }

    return stats;
  }

  private async validateUser(userId: string) {
    const user = await this.userRepo.findOneBy({ id: Number(userId) });
    if (!user) throw new NotFoundException('User not found');
  }
}