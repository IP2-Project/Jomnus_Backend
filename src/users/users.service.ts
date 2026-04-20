import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '@/users/entity/user.entity';
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

  async updateOtp(
    userId: string,
    otp: string | null,
    otpExpiry: Date | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, { otp, otpExpiry });
  }

  async updatePassword(userId: string, password: string): Promise<void> {
    const user = await this.findById(userId);
    if (user) {
      user.password = password;
      await this.usersRepository.save(user);
    }
  }

  async findAll(): Promise<UserEntity[]> {
    return this.usersRepository.find();
  }

  // async updateRefreshToken(
  //   userId: number,
  //   refreshToken: string | null,
  // ): Promise<void> {
  //   await this.usersRepository.update(userId, { refreshToken });
  // }
}