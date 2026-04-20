import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './entities/user.entity';
import { RegisterAuthDto } from '@/auth/dto/register-auth.dto';
import { StatsService } from '@/stats/stats.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,

    private statsService: StatsService,
  ) {}

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async create(registerDto: RegisterAuthDto): Promise<User> {
    const user = this.usersRepository.create(registerDto);
    const savedUser = await this.usersRepository.save(user);

    // 🔥 create stats automatically
    await this.statsService.createInitialStats(savedUser);

    return savedUser;
  }

  // async updateRefreshToken(
  //   userId: number,
  //   refreshToken: string | null,
  // ): Promise<void> {
  //   await this.usersRepository.update(userId, { refreshToken });
  // }
}