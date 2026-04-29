// @/users/users.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from '@/users/entity/user.entity';
import { RegisterAuthDto } from '@/auth/dto/register-auth.dto';
import { StatsService } from '@/stats/stats.service';
import { IdentityVerificationEntity } from '@/identity-verifications/entities/identity-verification.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    
    @InjectRepository(IdentityVerificationEntity)
    private verificationRepository: Repository<IdentityVerificationEntity>,

    private statsService: StatsService,
  ) {}

  async getPaginatedUsers(query: {
    page: number;
    limit: number;
    role?: string;
    verified?: string;
    status?: string;
    search?: string;
  }) {
    const { page = 1, limit = 10, role, verified, status, search } = query;
    const skip = (page - 1) * limit;

    // TypeORM QueryBuilder automatically handles Soft Delete (deletedAt IS NULL)
    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    if (role && role !== 'ALL') {
      queryBuilder.andWhere('user.currentRole = :role', { role });
    }

    if (verified === 'true') {
      queryBuilder.andWhere('user.isIdentityVerified = true');
    } else if (verified === 'false') {
      queryBuilder.andWhere('user.isIdentityVerified = false');
    }

    if (status && status !== 'ALL') {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.fullName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [users, total] = await queryBuilder
      .orderBy('user.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const data = users.map(user => ({
      ...user,
      verificationStatus: user.currentRole === UserRole.ADMIN 
        ? 'Internal' 
        : user.isIdentityVerified ? 'Yes' : 'No'
    }));

    return {
      data,
      meta: {
        totalItems: total,
        itemCount: data.length,
        itemsPerPage: Number(limit),
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
    };
  }

  async getAdminSummaryStats() {
    const pendingVerifications = await this.verificationRepository.count({
      where: { status: 'PENDING' } as any,
    });

    const totalUsers = await this.usersRepository.count();

    return { pendingVerifications, totalUsers };
  }

  // LOGIC 3: Manual Verify with History Sync
  async manualVerify(id: number) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    
    user.isIdentityVerified = true;
    user.status = 'active';

    // Sync History: Update latest document to APPROVED
    if (user.identityVerifications && user.identityVerifications.length > 0) {
      const latestDoc = user.identityVerifications[0]; 
      latestDoc.status = 'APPROVED' as any;
      await this.verificationRepository.save(latestDoc);
    }

    // LOGIC 2: Notification Placeholder
    // await this.notificationService.notify(id, 'Your account is verified.');

    return await this.usersRepository.save(user);
  }

  async changeRole(userId: number, newRole: UserRole, adminId?: number) {
    const targetUser = await this.findById(userId);
    if (!targetUser) throw new NotFoundException('User not found');

    if (targetUser.currentRole === UserRole.ADMIN && userId !== adminId) {
      throw new ForbiddenException('Cannot modify a fellow Administrator.');
    }

    if (adminId && userId === adminId && newRole !== UserRole.ADMIN) {
      throw new BadRequestException('You cannot remove your own Admin role.');
    }
    
    targetUser.currentRole = newRole;
    if (newRole === UserRole.ADMIN) targetUser.isIdentityVerified = true;
    
    return await this.usersRepository.save(targetUser);
  }

  async toggleStatus(id: number, status: string, adminId?: number) {
    if (adminId && id === adminId && status === 'banned') {
      throw new BadRequestException('You cannot ban your own account!');
    }

    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    
    user.status = status;

    // LOGIC 2: Notification Placeholder
    // await this.notificationService.notify(id, `Account status changed to ${status}`);

    return await this.usersRepository.save(user);
  }

  // LOGIC 1: Soft Delete Method
  async softRemove(id: number, adminId: number) {
    if (id === adminId) throw new BadRequestException('You cannot delete yourself.');
    
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');

    return await this.usersRepository.softDelete(id);
  }

  async findById(id: number): Promise<UserEntity | null> {
    return this.usersRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.identityVerifications', 'verification')
      .where('user.id = :id', { id })
      .orderBy('verification.id', 'DESC') // Ensure latest doc is first
      .getOne();
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(registerDto: RegisterAuthDto): Promise<UserEntity> {
    const isInternal = registerDto.email.includes('@jomnus.admin');

    const user = this.usersRepository.create({
      email: registerDto.email,
      password: registerDto.password,
      fullName: registerDto.fullName,
      currentRole: isInternal ? UserRole.ADMIN : UserRole.REQUESTER,
      isIdentityVerified: isInternal,
      status: 'active'
    });

    const savedUser = await this.usersRepository.save(user);
    if (this.statsService) {
      await this.statsService.createInitialStats(savedUser);
    }
    return savedUser;
  }

  async updateRefreshToken(userId: number, refreshToken: string): Promise<void> {
    await this.usersRepository.update(userId, { refreshToken: refreshToken || null });
  }

  async updateOtp(userId: number, otp: string | null, otpExpiry: Date | null): Promise<void> {
    await this.usersRepository.update(userId, { otp, otpExpiry });
  }

  async updatePassword(userId: number, password: string): Promise<void> {
    await this.usersRepository.update(userId, { password });
  }

  async findAll(): Promise<UserEntity[]> {
    return this.usersRepository.find();
  }
}