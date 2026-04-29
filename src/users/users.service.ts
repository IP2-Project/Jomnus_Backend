import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from './entity/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
// Ensure you import your RegisterDto or CreateUserDto here

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    
  ) {}

  // Added findById to satisfy auth.service and jwt.strategy
  async findById(id: number | string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id: Number(id) },
      relations: ['performerStats', 'requesterStats'],
    });
    if (!user) throw new NotFoundException('User not found');

    // 🔥 CREATE STATS HERE
    // await this.StatsService.createDefaultStats(user.id);

    return user;
  }

  // Added findByEmail to satisfy auth.service
  async findByEmail(email: string): Promise<UserEntity | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  // Added create to satisfy auth.service registration and Google login
  async create(userData: Partial<UserEntity>): Promise<UserEntity> {
    const newUser = this.userRepository.create(userData);
    return await this.userRepository.save(newUser);
  }

  // Added updateRefreshToken for login/logout flow
  async updateRefreshToken(id: number | string, refreshToken: string): Promise<void> {
    await this.userRepository.update(id, { refreshToken });
  }

  // Added updateOtp for forgot password flow
  async updateOtp(id: number | string, otp: string | null, otpExpiry: Date | null): Promise<void> {
    await this.userRepository.update(id, { otp, otpExpiry });
  }

  // Added updatePassword for reset password flow
  async updatePassword(id: number | string, password: string): Promise<void> {
    // In a real app, ensure the password is hashed before it reaches here 
    // or use a BeforeUpdate hook in the entity
    await this.userRepository.update(id, { password });
  }

  async findOne(id: string): Promise<UserEntity> {
    return this.findById(id);
  }

  // async updateMe(id: string, dto: UpdateProfileDto): Promise<UserEntity> {
  //   await this.userRepository.update(id, dto);
  //   return this.findById(id);
  // }

  async updateMe(userId: string, dto: UpdateProfileDto) {
  const user = await this.userRepository.findOneBy({ id: Number(userId) });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  // Update only allowed fields
  if (dto.fullName !== undefined) user.fullName = dto.fullName;
  if (dto.phone !== undefined) user.phone = dto.phone;
  if (dto.bio !== undefined) user.bio = dto.bio;
  if (dto.city !== undefined) user.city = dto.city;
  if (dto.country !== undefined) user.country = dto.country;

  // IMPORTANT: profileImage must already be URL
  if (dto.profileImage !== undefined) {
    user.profileImage = dto.profileImage;
  }

  return this.userRepository.save(user);
}
  async switchRole(id: string, newRole: UserRole): Promise<UserEntity> {
    if (newRole === UserRole.ADMIN) {
      throw new ForbiddenException('Admin role cannot be assigned manually');
    }

    const user = await this.findById(id);

    if (newRole === UserRole.PERFORMER && !user.isPerformer) {
      throw new ForbiddenException('You have not been approved as a performer');
    }

    user.currentRole = newRole;
    return this.userRepository.save(user);
  }

  
}