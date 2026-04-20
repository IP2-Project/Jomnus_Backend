import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '@/users/entity/user.entity';
import { RegisterAuthDto } from '@/auth/dto/register-auth.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(registerDto: RegisterAuthDto): Promise<UserEntity> {
    const user = this.usersRepository.create(registerDto);
    return this.usersRepository.save(user);
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, { refreshToken });
  }

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
}
