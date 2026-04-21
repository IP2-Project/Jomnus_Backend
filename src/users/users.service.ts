import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '@/users/entity/user.entity';
import { RegisterAuthDto } from '@/auth/dto/register-auth.dto';
import { StatsService } from '@/stats/stats.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,

    private statsService: StatsService,
  ) {}

  async findById(id: number): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findAll(): Promise<UserEntity[]> {
    return this.usersRepository.find();
  }

  async create(registerDto: RegisterAuthDto): Promise<UserEntity> {
    const user = this.usersRepository.create({
      email: registerDto.email,
      password: registerDto.password,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
    });

    const savedUser = await this.usersRepository.save(user);

    // Create initial stats for the user
    await this.statsService.createInitialStats(savedUser);

    return savedUser;
  }

  async updateRefreshToken(userId: number, refreshToken: string): Promise<void> {
    await this.usersRepository.update(userId, {
      refreshToken: refreshToken || null,
    });
  }

  async updateOtp(
    userId: number,
    otp: string | null,
    otpExpiry: Date | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      otp: otp,
      otpExpiry: otpExpiry,
    });
  }

  async updatePassword(userId: number, password: string): Promise<void> {
    await this.usersRepository.update(userId, {
      password: password,
    });
  }
}