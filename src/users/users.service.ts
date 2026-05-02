import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserRole, UserStatus } from '@/users/entity/user.entity';
import { RegisterAuthDto } from '@/auth/dto/register-auth.dto';
import { StatsService } from '@/stats/stats.service';
import { IdentityVerificationEntity, VerificationStatus } from '@/identity-verifications/entities/identity-verification.entity';
import { AuditLogEntity } from '@/identity-verifications/entities/audit-log.entity';
import { DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    
    @InjectRepository(IdentityVerificationEntity)
    private verificationRepository: Repository<IdentityVerificationEntity>,

    @InjectRepository(AuditLogEntity)
    private auditLogRepository: Repository<AuditLogEntity>,

    private statsService: StatsService,

    private dataSource: DataSource,
  ) {}

  // --- DASHBOARD LOGIC ---

async getPaginatedUsers(query: {
    page: number;
    limit: number;
    role?: string;
    verified?: string;
    status?: string;
    search?: string;
    pendingOnly?: string;
  }) {
    const { page = 1, limit = 10, role, verified, status, search, pendingOnly } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    // Filter for BANNED (soft-deleted) vs ACTIVE
    if (status === 'BANNED') {
      queryBuilder
        .withDeleted()
        .where('user.deletedAt IS NOT NULL');
    } else if (status === 'ACTIVE') {
      queryBuilder.where('user.deletedAt IS NULL');
    }

    // Filter for pending identity verifications
    if (pendingOnly === 'true') {
      queryBuilder
        .innerJoin('user.identityVerifications', 'verification')
        .andWhere('verification.status = :vStatus', { vStatus: 'PENDING' });
    }

    // Role filtering
    if (role && role !== 'ALL') {
      queryBuilder.andWhere('user.currentRole = :role', { role });
    }

    // Search logic
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

    // MAP DATA & FIX EXCLUDE BUG
    const data = users.map(user => {
      let vLabel = 'No';
      if (user.currentRole === UserRole.ADMIN) {
        vLabel = 'Internal';
      } else if (user.isIdentityVerified) {
        vLabel = user.isVerified ? 'Verified' : 'Yes';
      }

      // Create a plain object first
      const plainObject = {
        ...user,
        verificationStatus: vLabel,
        displayStatus: user.deletedAt ? 'Banned' : 'Active' 
      };

      // Convert back to UserEntity instance so @Exclude() works
      return plainToInstance(UserEntity, plainObject);
    });

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

  // --- ADMIN ACTIONS ---

  async manualVerify(userId: number, adminId: number) {
    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(UserEntity, { 
        where: { id: userId },
        relations: ['identityVerifications'] 
      });
      
      if (!user) throw new NotFoundException('User not found');

      if (user.isIdentityVerified && user.status === UserStatus.ACTIVE) {
        throw new BadRequestException('This user is already verified and active.');
      }

      user.isIdentityVerified = true;
      user.status = UserStatus.ACTIVE;
      user.isPerformer = (user.currentRole === UserRole.PERFORMER);
      
      await manager.save(user);

      let verification = await manager.findOne(IdentityVerificationEntity, {
        where: { user: { id: userId } }
      });

      if (verification) {
        verification.status = VerificationStatus.APPROVED;
        verification.rejection_reason = 'Manually verified by Administrator';
        verification.reviewed_by = adminId;
        verification.reviewed_at = new Date();
        await manager.save(verification);
      } else {
        const newVerify = manager.create(IdentityVerificationEntity, {
          user: user,
          status: VerificationStatus.APPROVED,
          rejection_reason: 'Manually verified by Administrator',
          reviewed_by: adminId,
          reviewed_at: new Date(),
          id_card_url: 'MANUAL_BYPASS',
          selfie_url: 'MANUAL_BYPASS',
        });
        await manager.save(newVerify);
      }

      await manager.save(AuditLogEntity, {
        adminId: adminId,
        action: 'MANUAL_VERIFICATION',
        targetUserId: userId, 
        reason: 'Bypassed document upload via Admin panel.',
        createdAt: new Date(),
      });

      return { message: 'User manually verified and audit trail created.' };
    });
  }

  async changeRole(userId: number, newRole: UserRole, adminId: number) {
    if (userId === adminId) {
      throw new BadRequestException('Admins cannot change their own roles.');
    }

    const targetUser = await this.findById(userId);
    if (!targetUser) throw new NotFoundException('User not found');

    if (targetUser.currentRole === UserRole.ADMIN && newRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to demote another Administrator.');
    }

    if (newRole === UserRole.PERFORMER && !targetUser.isIdentityVerified) {
      throw new BadRequestException('User must be identity verified before becoming a Performer.');
    }

    const oldRole = targetUser.currentRole;
    
    targetUser.currentRole = newRole;
    targetUser.isPerformer = (newRole === UserRole.PERFORMER);

    const savedUser = await this.usersRepository.save(targetUser);

    if (newRole === UserRole.PERFORMER) {
      await this.statsService.createInitialStats(savedUser);
    }

    await this.auditLogRepository.save({
      adminId: adminId,
      action: 'ROLE_CHANGE',
      targetUserId: userId,
      reason: `Role changed from ${oldRole} to ${newRole}`,
      createdAt: new Date(),
    });

    return savedUser;
  }

  async toggleVerifiedBadge(id: number, isVerified: boolean, adminId: number) {
  const user = await this.findById(id);
  if (!user) throw new NotFoundException('User not found');

  user.isVerified = isVerified;
  const savedUser = await this.usersRepository.save(user);

  await this.auditLogRepository.save({
    adminId: adminId,
    action: 'VERIFIED_BADGE_TOGGLE',
    targetUserId: id,
    reason: `Manual verification badge set to ${isVerified}`,
    createdAt: new Date(),
  });

  return savedUser;
  }

  // --- RESTORE, TOGGLE, DELETE ---

  async restoreUser(userId: number, adminId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      withDeleted: true, 
    });

    if (!user) throw new NotFoundException(`User with ID ${userId} not found.`);
    if (!user.deletedAt) throw new BadRequestException('User is already active.');

    await this.usersRepository.restore(userId);

    await this.auditLogRepository.save({
      adminId: adminId,
      action: 'USER_RESTORED',
      targetUserId: userId,
      reason: 'Account restored by Administrator',
      createdAt: new Date(),
    });

    return { message: 'User account successfully restored.', userId };
  }

  async toggleStatus(id: number, status: UserStatus, adminId?: number) {
    // 1. SELF-PROTECTION
    if (adminId && id === adminId && status === UserStatus.BANNED) {
      throw new BadRequestException('You cannot ban your own account!');
    }

    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');

    // 2. NEW RANK-PROTECTION: Prevent banning other Admins
    if (adminId && user.currentRole === UserRole.ADMIN && status === UserStatus.BANNED) {
      throw new ForbiddenException('You do not have permission to ban another Administrator.');
    }
    
    user.status = status;
    if (status === UserStatus.BANNED) user.refreshToken = null;

    const savedUser = await this.usersRepository.save(user);

    if (adminId) {
      await this.auditLogRepository.save({
        adminId: adminId,
        action: status === UserStatus.BANNED ? 'USER_BANNED' : 'USER_ACTIVATED',
        targetUserId: id, 
        reason: `User account status manually set to ${status} by Admin.`,
        createdAt: new Date(),
      });
    }

    return savedUser;
  }

  async softRemove(id: number, adminId: number) {
    if (id === adminId) throw new BadRequestException('You cannot delete yourself.');
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');

    await this.auditLogRepository.save({
      adminId: adminId,
      action: 'USER_DELETED',
      targetUserId: id, 
      reason: 'User account soft-deleted', // Changed from 'details' to 'reason'
      createdAt: new Date(),
    });

    return await this.usersRepository.softDelete(id);
  }

  // --- CORE FINDERS ---

  async findById(id: number): Promise<any | null> {
    const baseUrl = process.env.APP_URL || 'http://localhost:3001';
    
    const user = await this.usersRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.identityVerifications', 'verification')
      .where('user.id = :id', { id })
      .orderBy('verification.id', 'DESC')
      .getOne();

    if (!user) return null;

    if (user.identityVerifications) {
      user.identityVerifications = user.identityVerifications.map(v => ({
        ...v,
        id_card_url: v.id_card_url ? `${baseUrl}/${v.id_card_url}` : null,
        selfie_url: v.selfie_url ? `${baseUrl}/${v.selfie_url}` : null,
      }));
    }

    return user;
  }

  async findAll(): Promise<UserEntity[]> {
    return this.usersRepository.find();
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // --- AUTH & ACCOUNT MAINTENANCE ---

  async create(registerDto: RegisterAuthDto): Promise<UserEntity> {
    const isInternal = registerDto.email.includes('@jomnus.admin');
    const role = isInternal ? UserRole.ADMIN : UserRole.REQUESTER;

    const user = this.usersRepository.create({
      email: registerDto.email,
      password: registerDto.password,
      fullName: registerDto.fullName,
      currentRole: role,
      isIdentityVerified: isInternal,
      isPerformer: false,
      status: UserStatus.ACTIVE
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
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (user) {
      user.password = password;
      await this.usersRepository.save(user);
    }
  }
}