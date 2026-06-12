import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ForbiddenException, 
  Inject, 
  forwardRef 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserEntity, UserRole, UserStatus } from '@/users/entity/user.entity';
import { RegisterAuthDto } from '@/auth/dto/register-auth.dto';
import { StatsService } from '@/stats/stats.service';
import { IdentityVerificationEntity, VerificationStatus } from '@/identity-verifications/entities/identity-verification.entity';
import { AuditLogEntity } from '@/identity-verifications/entities/audit-log.entity';
import { IdentityVerificationsService } from '@/identity-verifications/identity-verifications.service';
import { plainToInstance } from 'class-transformer';
import { SwitchRoleDto } from './dto/switch-role.dto';


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

    @Inject(forwardRef(() => IdentityVerificationsService))
    private readonly identityService: IdentityVerificationsService,
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
  const { page = 1, limit = 10, role, status, search, pendingOnly, verified } = query;
  const skip = (page - 1) * limit;

  const queryBuilder = this.usersRepository.createQueryBuilder('user')
    .leftJoinAndSelect('user.identityVerifications', 'verification');

  if (status === 'BANNED') {
    queryBuilder
      .withDeleted() 
      .where('(user.deletedAt IS NOT NULL OR user.status = :bStatus)', { bStatus: UserStatus.BANNED });
  } else if (status === 'ACTIVE') {
    queryBuilder
      .where('user.deletedAt IS NULL')
      .andWhere('user.status = :aStatus', { aStatus: UserStatus.ACTIVE });
  } else {
    queryBuilder.withDeleted();
  }

  if (pendingOnly === 'true') {
    queryBuilder.andWhere('verification.status = :vStatus', { vStatus: VerificationStatus.PENDING });
  }

  if (role && role !== 'ALL') {
    queryBuilder.andWhere('user.currentRole = :role', { role: role.toUpperCase() });
  }

  if (verified === 'true') {
    queryBuilder.andWhere('(user.isVerified = true OR user.isIdentityVerified = true)');
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

  const data = users.map(user => {
    const latestRequest = user.identityVerifications && user.identityVerifications.length > 0
      ? user.identityVerifications[user.identityVerifications.length - 1]
      : null;

    const currentQueueStatus = latestRequest ? latestRequest.status : 'NONE';

    const isAccountBanned = user.deletedAt !== null || user.status === UserStatus.BANNED;

    return {
      ...user,
      verificationStatus: currentQueueStatus,
      displayStatus: isAccountBanned ? 'Banned' : 'Active',
      status: isAccountBanned ? UserStatus.BANNED : UserStatus.ACTIVE 
    };
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
      where: { status: VerificationStatus.PENDING },
    });
    const totalUsers = await this.usersRepository.count();
    return { pendingVerifications, totalUsers };
  }

  async reviewVerification(id: number, status: VerificationStatus, adminId: number, reason?: string) {
    return this.identityService.review(id, adminId, { status, rejection_reason: reason });
  }

  async getPendingVerifications(page: number, limit: number = 10) {
    return this.identityService.getPaginatedList(page, limit, '', 'PENDING');
  }

  async getUserAuditLogs(userId: number) {
    return this.auditLogRepository.find({
      where: { targetUserId: userId },
      relations: ['admin'],
      order: { createdAt: 'DESC' },
      take: 20
    });
  }


async manualVerify(userId: number, adminId: number) {
  return await this.dataSource.transaction(async (manager) => {

    const user = await manager.findOne(UserEntity, { 
      where: { id: userId },
      withDeleted: true, 
      relations: ['identityVerifications'] 
    });
    
    if (!user) throw new NotFoundException('User not found');

    if (user.status === UserStatus.BANNED || user.deletedAt) {
      throw new BadRequestException(
        'Cannot manually verify a banned user. Please restore the account first if this was an error.'
      );
    }

    user.isIdentityVerified = true;
    user.status = UserStatus.ACTIVE;
    
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
      adminId,
      action: 'MANUAL_VERIFICATION',
      targetUserId: userId, 
      reason: 'Bypassed document upload via Admin panel.',
      createdAt: new Date(),
    });

    return { message: 'User manually verified and audit trail created.' };
  });
}

  async changeRole(userId: number, newRole: UserRole, adminId: number) {
    if (userId === adminId) throw new BadRequestException('Admins cannot change their own roles.');

    const targetUser = await this.findById(userId);
    if (!targetUser) throw new NotFoundException('User not found');

    const oldRole = targetUser.currentRole;
    targetUser.currentRole = newRole;
    targetUser.isPerformer = (newRole === UserRole.PERFORMER);

    const savedUser = await this.usersRepository.save(targetUser);

    if (newRole === UserRole.PERFORMER) {
      await this.statsService.createInitialStats(savedUser);
    }

    await this.auditLogRepository.save({
      adminId,
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
      adminId,
      action: 'VERIFIED_BADGE_TOGGLE',
      targetUserId: id,
      reason: `Manual verification badge set to ${isVerified}`,
      createdAt: new Date(),
    });

    return savedUser;
  }

async restoreUser(userId: number, adminId: number) {
  const user = await this.usersRepository.findOne({
    where: { id: userId },
    withDeleted: true, 
  });

  if (!user) throw new NotFoundException(`User with ID ${userId} not found.`);

  // 1. DATABASE SYNC: Clear deletedAt
  await this.usersRepository.restore(userId);

  // 2. STATUS SYNC: Reset enum to active
  await this.usersRepository.update(userId, { status: UserStatus.ACTIVE });

  // 3. AUDIT SYNC
  await this.auditLogRepository.save({
    adminId,
    action: 'USER_RESTORED',
    targetUserId: userId,
    reason: 'Account restored by Administrator',
    createdAt: new Date(),
  });

  return { message: 'User account successfully restored.', userId };
}

  async toggleStatus(id: number, status: UserStatus, adminId?: number) {
    if (adminId && id === adminId && status === UserStatus.BANNED) {
      throw new BadRequestException('You cannot ban your own account!');
    }

    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    
    user.status = status;
    if (status === UserStatus.BANNED) user.refreshToken = null;

    const savedUser = await this.usersRepository.save(user);

    if (adminId) {
      await this.auditLogRepository.save({
        adminId,
        action: status === UserStatus.BANNED ? 'USER_BANNED' : 'USER_ACTIVATED',
        targetUserId: id, 
        reason: `User status set to ${status} by Admin.`,
        createdAt: new Date(),
      });
    }

    return savedUser;
  }

  async BanUser(id: number, adminId: number) {
    if (id === adminId) throw new BadRequestException('You cannot ban yourself.');
    
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');

    return await this.dataSource.transaction(async (manager) => {
      // 1. Mark status as BANNED so they can't log in
      await manager.update(UserEntity, id, { 
        status: UserStatus.BANNED,
        refreshToken: null 
      });

      // 2. Audit Log
      await manager.save(AuditLogEntity, {
        adminId,
        action: 'USER_BANNED',
        targetUserId: id, 
        reason: 'User account banned via admin panel.',
      });

      // 3. Soft Delete
      return await manager.softDelete(UserEntity, id);
    });
  }


  async findOneBy(where: any): Promise<UserEntity | null> {
    return await this.usersRepository.findOneBy(where);
  }

  async findById(id: number): Promise<any | null> {
    const baseUrl = process.env.APP_URL || 'http://localhost:3001';
    
    const user = await this.usersRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.identityVerifications', 'verification')
      .leftJoinAndSelect('user.tasks', 'tasks')
      .leftJoinAndSelect('user.reviewsGiven', 'reviewsGiven')
      .leftJoinAndSelect('user.reviewsReceived', 'reviewsReceived')
      .leftJoinAndSelect('user.performerStats', 'performerStats')
      .leftJoinAndSelect('user.requesterStats', 'requesterStats')
      .where('user.id = :id', { id })
      .orderBy('verification.id', 'DESC')
      .getOne();

    if (!user) return null;
    

    if (user.identityVerifications) {
      user.identityVerifications = user.identityVerifications.map(v => ({
        ...v,
        id_card_url: v.id_card_url && v.id_card_url !== 'MANUAL_BYPASS' ? `${baseUrl}/${v.id_card_url}` : v.id_card_url,
        selfie_url: v.selfie_url && v.selfie_url !== 'MANUAL_BYPASS' ? `${baseUrl}/${v.selfie_url}` : v.selfie_url,
      }));
    }

    return {
      ...user,

      performerStats: user.performerStats || null,
      requesterStats: user.requesterStats || null,
      requester_stats: user.requesterStats || null,
      performer_stats: user.performerStats || null,
      
    };

  }

  async findAll(): Promise<UserEntity[]> {
    return this.usersRepository.find();
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { email } });
  }


  async create(registerDto: RegisterAuthDto): Promise<UserEntity> {
    const isInternal = registerDto.email.includes('@jomnus.admin');
    const role = isInternal ? UserRole.ADMIN : UserRole.REQUESTER;

    const user = this.usersRepository.create({
      ...registerDto,
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

  async updateMe(userId: number, updateUserDto: any) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Define which fields are allowed to be updated by the user themselves
    const allowedUpdates = [
      'fullName', 
      'phone', 
      'bio', 
      'city', 
      'country', 
      'profileImage'
    ];

    // Merge only allowed fields into the user entity
    Object.keys(updateUserDto).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        user[key] = updateUserDto[key];
      }
    });

    return await this.usersRepository.save(user);
  }

  async switchUserRole(userId: number, switchRoleDto: SwitchRoleDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    user.currentRole = switchRoleDto.role;
    user.isPerformer = (switchRoleDto.role === UserRole.PERFORMER);

    return await this.usersRepository.save(user);
  }
  
}
