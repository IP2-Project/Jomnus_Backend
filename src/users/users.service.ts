import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from './entity/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['performerStats', 'requesterStats'], 
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(id: string, dto: UpdateProfileDto): Promise<UserEntity> {
    await this.userRepository.update(id, dto);
    return this.findOne(id);
  }

  async switchRole(id: string, newRole: UserRole): Promise<UserEntity> {
    // Prevent switching to ADMIN via public endpoint
    if (newRole === UserRole.ADMIN) {
      throw new ForbiddenException('Admin role cannot be assigned manually');
    }

    const user = await this.findOne(id);

    // If switching to Performer, verify they are allowed to perform
    if (newRole === UserRole.PERFORMER && !user.isPerformer) {
      throw new ForbiddenException('You have not been approved as a performer');
    }

    user.currentRole = newRole;
    return this.userRepository.save(user);
  }
}