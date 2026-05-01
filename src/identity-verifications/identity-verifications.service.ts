import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ForbiddenException,
  Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, DataSource, In, Brackets } from 'typeorm';
import { IdentityVerificationEntity, VerificationStatus } from './entities/identity-verification.entity';
import { AuditLogEntity } from './entities/audit-log.entity';
import { UserEntity } from '@/users/entity/user.entity';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { IdentityGateway } from './identity.gateway'; 
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
      relations: ['admin', 'targetUser'], // Updated to include targetUser for Activity Feed names
    });

    return { totalPending, processedToday, processedAvatars, recentActivity };
  }

  /**
   * Handles user submission of identity documents
   */
  async create(userId: number, dto: { id_card_url: string; selfie_url: string }) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    let verification = await this.verificationRepo.findOne({ where: { user_id: userId } });

    // Anti-spam check
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

    return await this.dataSource.transaction(async (manager) => {
      let result;
      if (verification) {
        await this.deletePhysicalFiles([verification.id_card_url, verification.selfie_url]);
        verification.id_card_url = dto.id_card_url;
        verification.selfie_url = dto.selfie_url;
        verification.status = VerificationStatus.PENDING;
        verification.rejection_reason = null;
        result = await manager.save(verification);
      } else {
        const newRequest = manager.create(IdentityVerificationEntity, {
          user_id: userId,
          id_card_url: dto.id_card_url,
          selfie_url: dto.selfie_url,
          status: VerificationStatus.PENDING,
        });
        result = await manager.save(newRequest);
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

      await this.broadcastStats();
      return result;
    });
  }

  /**
   * Admin Review (Approve/Reject)
   */
  async review(id: number, adminId: number, dto: ReviewVerificationDto) {
    const admin = await this.userRepo.findOne({ where: { id: adminId } });
    if (!admin) throw new ForbiddenException('Invalid Admin performing review.');

    return await this.dataSource.transaction(async (manager) => {
      const verification = await manager.findOne(IdentityVerificationEntity, { 
        where: { id },
        lock: { mode: 'pessimistic_write' } 
      });

      if (!verification) throw new NotFoundException('Request not found');

      // GUARD: Block approval if images are null
      if (dto.status === VerificationStatus.APPROVED) {
        if (!verification.id_card_url || !verification.selfie_url) {
          throw new BadRequestException('Cannot approve: Identity documents (ID or Selfie) are missing.');
        }
      }

      if (verification.status === dto.status) throw new BadRequestException(`Request is already ${dto.status}.`);
      
      if (dto.status === VerificationStatus.REJECTED && !dto.rejection_reason?.trim()) {
        throw new BadRequestException('Rejection reason required.');
      }

      verification.status = dto.status;
      verification.reviewed_by = adminId;
      verification.reviewed_at = new Date();
      verification.rejection_reason = dto.status === VerificationStatus.REJECTED ? dto.rejection_reason : null;
      await manager.save(verification);

      await manager.update(UserEntity, verification.user_id, {
        isIdentityVerified: dto.status === VerificationStatus.APPROVED,
      });

      await manager.save(AuditLogEntity, {
        action: dto.status,
        reason: dto.rejection_reason ?? undefined, 
        targetUserId: verification.user_id,
        adminId: adminId,
      });

      const isApproved = dto.status === VerificationStatus.APPROVED;
      await this.notificationsService.createNotification({
        user_id: verification.user_id,
        audience: 'user',
        title: isApproved ? 'Identity Verified' : 'Status Updated',
        message: isApproved ? 'Your identity is verified!' : `Rejected: ${dto.rejection_reason}`,
        type: isApproved ? 'APPLICATION_ACCEPTED' : 'APPLICATION_REJECTED',
      });

      await this.broadcastStats(); 
      return verification;
    });
  }

  /**
   * Resets a record to Pending (Rollback)
   */
  async resetToPending(id: number, adminId: number) {
    const verification = await this.verificationRepo.findOne({ where: { id } });
    if (!verification) throw new NotFoundException('Request not found');

    return await this.dataSource.transaction(async (manager) => {
      await manager.update(UserEntity, verification.user_id, { isIdentityVerified: false });
      
      verification.status = VerificationStatus.PENDING;
      verification.rejection_reason = null;
      verification.reviewed_at = null as any; 
      verification.reviewed_by = null as any;
      await manager.save(verification);

      await manager.save(AuditLogEntity, {
        action: 'RESET_TO_PENDING',
        reason: 'Admin manually reset verification to pending.',
        targetUserId: verification.user_id,
        adminId: adminId,
      });

      await this.notificationsService.createNotification({
        user_id: verification.user_id,
        audience: 'user',
        title: 'Verification Reset',
        message: 'Your identity verification has been reset to pending for re-review.',
        type: 'INFO_UPDATE', 
      });

      await this.broadcastStats();
      return { message: 'Reset successful' };
    });
  }

  /**
   * Hard delete of physical images and reset
   */
  async clearVerificationImages(id: number, adminId: number) {
    const verification = await this.verificationRepo.findOne({ where: { id } });
    if (!verification) throw new NotFoundException('Request not found');

    return await this.dataSource.transaction(async (manager) => {
      await this.deletePhysicalFiles([verification.id_card_url, verification.selfie_url]);
      
      verification.id_card_url = null;
      verification.selfie_url = null;
      verification.status = VerificationStatus.PENDING;
      verification.rejection_reason = "Images cleared by admin. Please re-upload.";
      await manager.save(verification);

      await manager.save(AuditLogEntity, {
        action: 'IMAGES_CLEARED',
        reason: 'Admin manually deleted images from the system.',
        targetUserId: verification.user_id,
        adminId: adminId,
      });

      await this.notificationsService.createNotification({
        user_id: verification.user_id,
        audience: 'user',
        title: 'Action Required: Re-upload ID',
        message: 'Your verification images were cleared by an admin. Please upload clear copies of your ID and selfie.',
        type: 'INFO_UPDATE', 
      });

      await this.broadcastStats();
      return { message: 'Images deleted and user notified.' };
    });
  }

  /**
   * Paginated List - ULTRA STRICT VERSION
   */
  async getPaginatedList(page: number, limit: number, search?: string, status?: string) {
    const skip = (page - 1) * limit;
    
    // Use environment variable for the base URL, or default to your local dev URL
    const baseUrl = process.env.APP_URL || 'http://localhost:3001';

    this.logger.log(`Received Status: "${status}"`);
    this.logger.log(`Received Search: "${search}"`);

    const queryBuilder = this.verificationRepo.createQueryBuilder('verification')
      .leftJoinAndSelect('verification.user', 'user') 
      .leftJoinAndSelect('verification.reviewer', 'reviewer')
      .where('1=1');

    // 1. Filter by Status
    if (status && status.toUpperCase() !== 'ALL') {
      const upperStatus = status.toUpperCase();
      queryBuilder.andWhere('verification.status = :status', { status: upperStatus });
    }

    // 2. Search by Name/Email
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

    // 3. MAP THE DATA TO INCLUDE FULL URLs
    // This turns "uploads/file.jpg" into "http://localhost:3001/uploads/file.jpg"
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

  /**
   * Exports verification data to CSV with reviewer details
   */
  async exportToCsv() {
    const data = await this.verificationRepo.find({
      relations: ['user', 'reviewer'], // Updated for professional transparency
      order: { created_at: 'DESC' },
    });
    
    const header = 'ID,Full Name,Email,Status,Rejection Reason,Reviewed By,Reviewed At,Created At\n';
    
    const rows = data.map(v => {
      const reviewerName = v.reviewer?.fullName || 'N/A';
      const reviewDate = v.reviewed_at ? v.reviewed_at.toISOString() : 'N/A';
      
      return `${v.id},"${v.user?.fullName}","${v.user?.email}",${v.status},"${v.rejection_reason || ''}","${reviewerName}",${reviewDate},${v.created_at?.toISOString()}`;
    }).join('\n');

    return header + rows;
  }

  private async deletePhysicalFiles(filePaths: (string | null)[]) {
    for (const filePath of filePaths) {
      if (!filePath) continue;
      try {
        const absolutePath = path.resolve(filePath);
        await fs.access(absolutePath); 
        await fs.unlink(absolutePath);
        this.logger.log(`Deleted file: ${filePath}`);
      } catch (err) {
        if ((err as any).code === 'ENOENT') {
          this.logger.warn(`File not found: ${filePath}`);
        } else {
          this.logger.error(`Failed to delete file: ${err}`);
        }
      }
    }
  }

  /**
   * Fetches a single verification record with full details
   */
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
}