import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ForbiddenException,
  Logger,
  Inject,     
  forwardRef  
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, DataSource, In, Brackets } from 'typeorm';
import { IdentityVerificationEntity, VerificationStatus } from './entities/identity-verification.entity';
import { AuditLogEntity } from './entities/audit-log.entity';
import { UserEntity, UserRole } from '@/users/entity/user.entity'; // Added UserRole import
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { IdentityGateway } from './identity.gateway'; 
import { UsersService } from '@/users/users.service'; // Added UsersService import
import * as fs from 'fs/promises'; 
import * as path from 'path';

@Injectable()
export class IdentityVerificationsService {
  private readonly logger = new Logger(IdentityVerificationsService.name);

  constructor(
    @InjectRepository(IdentityVerificationEntity)
    private readonly verificationRepo: Repository<IdentityVerificationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepo: Repository<AuditLogEntity>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
    private readonly gateway: IdentityGateway,

    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService, 
  ) {}

  /**
   * Updates real-time dashboard stats via WebSockets
   */
  private async broadcastStats() {
    try {
      const stats = await this.getAdminStats();
      this.gateway.emitStatsUpdate(stats);
    } catch (error) {
      this.logger.error('Failed to broadcast real-time stats', error);
    }
  }

  /**
   * Fetches counts and activity for the Admin Dashboard
   */
  async getAdminStats() {
    const totalPending = await this.verificationRepo.count({
      where: { status: VerificationStatus.PENDING },
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const processedToday = await this.verificationRepo.count({
      where: { 
        status: In([VerificationStatus.APPROVED, VerificationStatus.REJECTED]),
        reviewed_at: MoreThanOrEqual(startOfToday) 
      },
    });

    const processedTodayDetails = await this.verificationRepo.find({
      where: { reviewed_at: MoreThanOrEqual(startOfToday) },
      relations: ['user'],
      take: 6,
    });

    const processedAvatars = processedTodayDetails.map(v => {
      if (v.user?.profileImage) return v.user.profileImage;
      const name = v.user?.fullName || 'User';
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
    });

    const recentActivity = await this.auditLogRepo.find({
      order: { createdAt: 'DESC' },
      take: 5, 
      relations: ['admin', 'targetUser'],
    });

    return { totalPending, processedToday, processedAvatars, recentActivity };
  }

  /**
   * Handles user submission of identity documents
   */
async create(userId: number, dto: { id_card_url: string; selfie_url: string }) {
  const user = await this.userRepo.findOne({ where: { id: userId } });
  if (!user) throw new NotFoundException('User not found');

  let verification = await this.verificationRepo.findOne({ where: { user: { id: userId } } });

  // Safety check for spamming
  if (verification?.status === VerificationStatus.PENDING) {
    const now = new Date().getTime();
    const lastUpdate = new Date(verification.updated_at).getTime();
    if (now - lastUpdate < 30000) { 
      await this.deletePhysicalFiles([dto.id_card_url, dto.selfie_url]);
      throw new BadRequestException('Your request is already being processed. Please wait a moment.');
    }
  }

  if (verification?.status === VerificationStatus.APPROVED) {
    await this.deletePhysicalFiles([dto.id_card_url, dto.selfie_url]);
    throw new BadRequestException('Identity already verified.');
  }

  // 1. Prepare list of old files to delete ONLY if the DB update succeeds
 const oldFilesToDelete: string[] = [];
  if (verification) {
    if (verification.id_card_url) oldFilesToDelete.push(verification.id_card_url);
    if (verification.selfie_url) oldFilesToDelete.push(verification.selfie_url);
  }

  const result = await this.dataSource.transaction(async (manager) => {
    let savedRecord;
    if (verification) {
      // We don't delete files here anymore!
      verification.id_card_url = dto.id_card_url;
      verification.selfie_url = dto.selfie_url;
      verification.status = VerificationStatus.PENDING;
      verification.rejection_reason = null;
      savedRecord = await manager.save(verification);
    } else {
      const newRequest = manager.create(IdentityVerificationEntity, {
        user: user,
        id_card_url: dto.id_card_url,
        selfie_url: dto.selfie_url,
        status: VerificationStatus.PENDING,
      });
      savedRecord = await manager.save(newRequest);
    }

    await manager.save(AuditLogEntity, {
      action: 'REQUEST_SUBMITTED',
      reason: 'User uploaded identity documents.',
      targetUserId: userId,
      adminId: null, 
    });

    await this.notificationsService.createNotification({
      user_id: null,
      audience: 'admin',
      title: 'New Verification Request',
      message: `${user.fullName} has submitted documents for review.`,
      type: 'NEW_IDENTITY_REQUEST', 
    });

    return savedRecord;
  });

  // 2. NOW it is safe to delete the physical old files
  if (oldFilesToDelete.length > 0) {
    await this.deletePhysicalFiles(oldFilesToDelete);
  }

  await this.broadcastStats();
  return result;
}

/**
   * Admin Review (Approve/Reject)
   */
async review(id: number, adminId: number, dto: ReviewVerificationDto) {
    const admin = await this.userRepo.findOne({ where: { id: adminId } });
    if (!admin) throw new ForbiddenException('Invalid Admin performing review.');

    const result = await this.dataSource.transaction(async (manager) => {
      const verification = await manager.findOne(IdentityVerificationEntity, { 
        where: { id },
        relations: ['user'], 
      });

      if (!verification) throw new NotFoundException('Request not found');
      if (!verification.user) throw new BadRequestException('No user linked.');

      if (dto.status === VerificationStatus.APPROVED) {
        if (!verification.id_card_url || !verification.selfie_url) {
          throw new BadRequestException('Cannot approve: Identity documents (ID or Selfie) are missing.');
        }
      }

      if (verification.status === dto.status) throw new BadRequestException(`Request is already ${dto.status}.`);
      
      if (dto.status === VerificationStatus.REJECTED && !dto.rejection_reason?.trim()) {
        throw new BadRequestException('Rejection reason required.');
      }

      const isApproved = dto.status === VerificationStatus.APPROVED;

      verification.status = dto.status;
      verification.reviewed_by = adminId;
      verification.reviewed_at = new Date();
      verification.rejection_reason = dto.status === VerificationStatus.REJECTED ? dto.rejection_reason : null;
      
      await manager.save(verification);

      // --- SYNC START ---
      // Update the database directly
      await manager.update(UserEntity, verification.user.id, {
        isIdentityVerified: isApproved,
        isPerformer: isApproved,
        currentRole: isApproved ? UserRole.PERFORMER : UserRole.REQUESTER
      });

      // Update the local object so Postman shows the new data immediately
      verification.user.isIdentityVerified = isApproved;
      verification.user.isPerformer = isApproved;
      verification.user.currentRole = isApproved ? UserRole.PERFORMER : UserRole.REQUESTER;
      // --- SYNC END ---

      await manager.save(AuditLogEntity, {
        action: dto.status,
        reason: dto.rejection_reason ?? undefined, 
        targetUserId: verification.user.id,
        adminId: adminId,
      });

      return verification;
    });

    const isApproved = dto.status === VerificationStatus.APPROVED;
    await this.notificationsService.createNotification({
      user_id: result.user.id,
      audience: 'user',
      title: isApproved ? 'Identity Verified' : 'Status Updated',
      message: isApproved ? 'Your identity is verified!' : `Rejected: ${dto.rejection_reason}`,
      type: isApproved ? 'APPLICATION_ACCEPTED' : 'APPLICATION_REJECTED',
    });

    await this.broadcastStats(); 
    return result;
  }

  /**
   * Resets a record to Pending (Rollback)
   */
async resetToPending(id: number, adminId: number) {
    const verification = await this.verificationRepo.findOne({ 
      where: { id },
      relations: ['user'] 
    });

    if (!verification) throw new NotFoundException('Request not found');
    if (!verification.user) throw new BadRequestException('No associated user.');

    await this.dataSource.transaction(async (manager) => {
      // --- SYNC START ---
      // Revert user to Requester role immediately in the DB
      await manager.update(UserEntity, verification.user.id, { 
        isIdentityVerified: false,
        isPerformer: false,
        currentRole: UserRole.REQUESTER
      });
      // --- SYNC END ---
      
      verification.status = VerificationStatus.PENDING;
      verification.rejection_reason = null;
      verification.reviewed_at = undefined; // Clears the TS 'null' error
      verification.reviewed_by = undefined; // Clears the TS 'null' error
      await manager.save(verification);

      await manager.save(AuditLogEntity, {
        action: 'RESET_TO_PENDING',
        reason: 'Admin manually reset verification to pending.',
        targetUserId: verification.user.id,
        adminId: adminId,
      });

      await this.notificationsService.createNotification({
        user_id: verification.user.id,
        audience: 'user',
        title: 'Verification Reset',
        message: 'Your identity verification has been reset to pending for re-review.',
        type: 'INFO_UPDATE', 
      });
    });

    await this.broadcastStats();
    return { message: 'Reset successful' };
  }

  /**
   * Hard delete of physical images and reset
   */
async clearVerificationImages(userId: number, adminId: number) {
  // Change 'id' to find by user relationship
  const verification = await this.verificationRepo.findOne({ 
    where: { user: { id: userId } }, // Look for the record belonging to this user
    relations: ['user']
  });
  
  // If no verification exists, just exit quietly (important for softRemove)
  if (!verification) return { message: 'No images to clear.' };

  if (!verification.user) {
    throw new BadRequestException('Cannot clear images: No associated user found.');
  }

  return await this.dataSource.transaction(async (manager) => {
    // 1. Archive physical files
    await this.deletePhysicalFiles([verification.id_card_url, verification.selfie_url]);
    
    // 2. Reset database fields
    verification.id_card_url = null;
    verification.selfie_url = null;
    verification.status = VerificationStatus.PENDING;
    verification.rejection_reason = "Images cleared by admin. Please re-upload.";
    
    // Note: Since we are clearing images, we should also 
    // sync the user role back to REQUESTER to be safe.
    await manager.update(UserEntity, verification.user.id, {
      isIdentityVerified: false,
      isPerformer: false,
      currentRole: UserRole.REQUESTER
    });

    await manager.save(verification);

    // 3. Audit Log
    await manager.save(AuditLogEntity, {
      action: 'IMAGES_CLEARED',
      reason: 'Admin manually deleted images.',
      targetUserId: verification.user.id,
      adminId: adminId,
    });

    // 4. Notification
    await this.notificationsService.createNotification({
      user_id: verification.user.id,
      audience: 'user',
      title: 'Action Required: Re-upload ID',
      message: 'Your verification images were cleared. Please upload clear copies of your ID and selfie.',
      type: 'INFO_UPDATE', 
    });

    await this.broadcastStats();
    return { message: 'Images deleted and user notified.' };
  });
}

  /**
   * Paginated List
   */
  async getPaginatedList(page: number, limit: number, search?: string, status?: string) {
    const skip = (page - 1) * limit;
    const baseUrl = process.env.APP_URL || 'http://localhost:3001';

    const queryBuilder = this.verificationRepo.createQueryBuilder('verification')
      .leftJoinAndSelect('verification.user', 'user') 
      .leftJoinAndSelect('verification.reviewer', 'reviewer')
      .where('1=1');

    if (status && status.toUpperCase() !== 'ALL') {
      const upperStatus = status.toUpperCase();
      queryBuilder.andWhere('verification.status = :status', { status: upperStatus });
    }

    if (search && search.trim() !== '') {
      const searchPattern = `%${search.trim()}%`;
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('user.fullName ILIKE :searchQuery', { searchQuery: searchPattern })
            .orWhere('user.email ILIKE :searchQuery', { searchQuery: searchPattern });
        }),
      );
    }

    queryBuilder.orderBy('verification.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    const mappedData = data.map(item => ({
      ...item,
      id_card_url: item.id_card_url ? `${baseUrl}/${item.id_card_url}` : null,
      selfie_url: item.selfie_url ? `${baseUrl}/${item.selfie_url}` : null,
    }));

    return {
      data: mappedData,
      meta: {
        totalItems: total,
        itemCount: data.length,
        itemsPerPage: Number(limit),
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
    };
  }

async exportToCsv() {
  const data = await this.verificationRepo.find({
    relations: ['user', 'reviewer'], 
    order: { created_at: 'DESC' },
  });
  
  const header = 'ID,Full Name,Email,Status,Rejection Reason,Reviewed By,Reviewed At,Created At\n';
  
  const rows = data.map(v => {
    // Sanitize fields by replacing double quotes and wrapping in quotes
    const fullName = `"${(v.user?.fullName || '').replace(/"/g, '""')}"`;
    const email = `"${v.user?.email || ''}"`;
    const reason = `"${(v.rejection_reason || '').replace(/"/g, '""')}"`;
    const reviewerName = `"${(v.reviewer?.fullName || 'N/A').replace(/"/g, '""')}"`;
    const reviewDate = v.reviewed_at ? v.reviewed_at.toISOString() : 'N/A';
    
    return `${v.id},${fullName},${email},${v.status},${reason},${reviewerName},${reviewDate},${v.created_at?.toISOString()}`;
  }).join('\n');

  return header + rows;
}

private async deletePhysicalFiles(filePaths: (string | null)[]) {
  const archiveDir = './uploads/archive-identity';
  
  // Ensure the archive directory exists
  try {
    await fs.mkdir(archiveDir, { recursive: true });
  } catch (err) {
    this.logger.error('Could not create archive directory');
  }

  for (const filePath of filePaths) {
    if (!filePath || filePath === 'MANUAL_BYPASS') continue;
    
    try {
      const absolutePath = path.resolve(filePath);
      const fileName = path.basename(filePath);
      const archivedPath = path.join(archiveDir, `${Date.now()}-${fileName}`);

      // MOVE the file instead of UNLINKING it
      await fs.rename(absolutePath, archivedPath);
      this.logger.log(`Archived file to: ${archivedPath}`);
    } catch (err) {
      this.logger.error(`Failed to archive file: ${err}`);
    }
  }
}

  async getOne(id: number) {
    const baseUrl = process.env.APP_URL || 'http://localhost:3001';
    const verification = await this.verificationRepo.findOne({
      where: { id },
      relations: ['user', 'reviewer'],
    });

    if (!verification) throw new NotFoundException(`Verification with ID ${id} not found`);

    return {
      ...verification,
      id_card_url: verification.id_card_url ? `${baseUrl}/${verification.id_card_url}` : null,
      selfie_url: verification.selfie_url ? `${baseUrl}/${verification.selfie_url}` : null,
    };
  }

  async getOneByUser(userId: number) {
    const baseUrl = process.env.APP_URL || 'http://localhost:3001';
    const verification = await this.verificationRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'reviewer'],
      order: { created_at: 'DESC' },
    });

    if (!verification) return null;

    return {
      ...verification,
      id_card_url: verification.id_card_url && verification.id_card_url !== 'MANUAL_BYPASS' ? `${baseUrl}/${verification.id_card_url}` : verification.id_card_url,
      selfie_url: verification.selfie_url && verification.selfie_url !== 'MANUAL_BYPASS' ? `${baseUrl}/${verification.selfie_url}` : verification.selfie_url,
    };
  }
}