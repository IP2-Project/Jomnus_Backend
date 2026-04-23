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

  async createDefaultStats(userId: number) {
    const user = await this.userRepo.findOneBy({ id: userId });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const performer = this.performerRepo.create({
      user,
      completed_tasks: 0,
      avg_rating: 0,
      success_rate: 0,
      total_earnings: 0,
      response_time: 0,
    });

    const requester = this.requesterRepo.create({
      user,
      tasks_posted: 0,
      tasks_verified: 0,
      total_spent: 0,
    });

    await this.performerRepo.save(performer);
    await this.requesterRepo.save(requester);

    return { performer, requester };
  }
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