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

  // Initialize query builder
  const queryBuilder = this.usersRepository.createQueryBuilder('user');

  // 1. STATUS FILTER (Matches Figma Tabs)
  if (status === 'BANNED') {
    // We must include soft-deleted records to see 'Banned' users
    queryBuilder
      .withDeleted() 
      .where('user.deletedAt IS NOT NULL');
  } else {
    // Default to ACTIVE: TypeORM handles 'deletedAt IS NULL' automatically 
    // unless withDeleted() is called.
    queryBuilder.where('user.deletedAt IS NULL');
  }

  // 2. PENDING FILTER
  if (pendingOnly === 'true') {
    queryBuilder
      .innerJoin('user.identityVerifications', 'verification')
      .andWhere('verification.status = :vStatus', { vStatus: VerificationStatus.PENDING });
  }

  // 3. ROLE FILTER (e.g., ADMIN, PERFORMER, REQUESTER)
  if (role && role !== 'ALL') {
    queryBuilder.andWhere('user.currentRole = :role', { role });
  }

  // 4. VERIFIED FILTER (Missing in your snippet, but in Figma)
  if (verified === 'true') {
    queryBuilder.andWhere('(user.isVerified = true OR user.isIdentityVerified = true)');
  }

  // 5. SEARCH FILTER
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

  // 6. DATA MAPPING (Matches Figma Labels)
    const data = users.map(user => {
      let vLabel = 'No';
      if (user.currentRole === UserRole.ADMIN) {
        vLabel = 'Internal';
      } else if (user.isVerified || user.isIdentityVerified) {
        vLabel = 'Yes';
      }

    return {
        ...user,
        verificationStatus: vLabel,
        displayStatus: user.deletedAt ? 'Banned' : 'Active'
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

  // --- IDENTITY WORKFLOW BRIDGES ---

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

  // --- ADMIN ACTIONS ---

  async manualVerify(userId: number, adminId: number) {
    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(UserEntity, { 
        where: { id: userId },
        relations: ['identityVerifications'] 
      });
      
      if (!user) throw new NotFoundException('User not found');

      user.isIdentityVerified = true;
      user.isPerformer = true;               
      user.currentRole = UserRole.PERFORMER; 
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
    await this.usersRepository.restore(userId);

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

 async softRemove(id: number, adminId: number) {
  if (id === adminId) throw new BadRequestException('You cannot delete yourself.');
  
  const user = await this.findById(id);
  if (!user) throw new NotFoundException('User not found');

  return await this.dataSource.transaction(async (manager) => {
    // 1. PHYSICAL SYNC: Archive ID files before the user record is hidden
    // This calls the logic that moves files to /archive-identity
    await this.identityService.clearVerificationImages(id, adminId);

    // 2. AUDIT SYNC: Log the deletion and the archival
    await manager.save(AuditLogEntity, {
      adminId,
      action: 'USER_DELETED',
      targetUserId: id, 
      reason: 'User account soft-deleted and identity files archived for privacy.',
      createdAt: new Date(),
    });

    // 3. DATABASE SYNC: Mark the user as soft-deleted
    return await manager.softDelete(UserEntity, id);
  });
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
        id_card_url: v.id_card_url && v.id_card_url !== 'MANUAL_BYPASS' ? `${baseUrl}/${v.id_card_url}` : v.id_card_url,
        selfie_url: v.selfie_url && v.selfie_url !== 'MANUAL_BYPASS' ? `${baseUrl}/${v.selfie_url}` : v.selfie_url,
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

  // --- AUTH & MAINTENANCE ---

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
}