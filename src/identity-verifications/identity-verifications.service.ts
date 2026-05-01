import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ForbiddenException,
  Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, DataSource } from 'typeorm';
import { IdentityVerificationEntity, VerificationStatus } from './entities/identity-verification.entity';
import { AuditLogEntity } from './entities/audit-log.entity';
import { UserEntity } from '@/users/entity/user.entity';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { NotificationsService } from '../notifications/notifications.service';
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
  ) {}

  async getPaginatedList(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const queryBuilder = this.verificationRepo.createQueryBuilder('verification')
      .leftJoinAndSelect('verification.user', 'user')
      .leftJoinAndSelect('verification.reviewer', 'reviewer')
      .orderBy('verification.created_at', 'DESC');

    if (search) {
      queryBuilder.andWhere(
        '(user.fullName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [data, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

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

  async getAdminStats() {
    const totalPending = await this.verificationRepo.count({
      where: { status: VerificationStatus.PENDING },
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const processedToday = await this.verificationRepo.count({
      where: { reviewed_at: MoreThanOrEqual(startOfToday) },
    });

    const processedTodayDetails = await this.verificationRepo.find({
      where: { reviewed_at: MoreThanOrEqual(startOfToday) },
      relations: ['user'],
      take: 6,
    });

    const recentActivity = await this.verificationRepo.find({
      where: [
        { status: VerificationStatus.APPROVED },
        { status: VerificationStatus.REJECTED },
      ],
      order: { reviewed_at: 'DESC' },
      take: 5,
      relations: ['user', 'reviewer'],
    });

    return { 
      totalPending, 
      processedToday, 
      processedAvatars: processedTodayDetails
        .map(v => v.user?.profileImage)
        .filter((img): img is string => img !== null && img !== undefined), 
      recentActivity 
    };
  }

  async exportToCsv() {
    const data = await this.verificationRepo.find({
      relations: ['user'],
      order: { created_at: 'DESC' },
    });

    const header = 'ID,Full Name,Email,Status,Rejection Reason,Created At\n';
    const rows = data.map(v => 
      `${v.id},"${v.user?.fullName}","${v.user?.email}",${v.status},"${v.rejection_reason || ''}",${v.created_at?.toISOString()}`
    ).join('\n');

    return header + rows;
  }

  async create(userId: number, dto: { id_card_url: string; selfie_url: string }) {
    let verification = await this.verificationRepo.findOne({ where: { user_id: userId } });

    const blockUpload = async (message: string) => {
      await this.deletePhysicalFiles([dto.id_card_url, dto.selfie_url]);
      throw new BadRequestException(message);
    };

    if (verification?.status === VerificationStatus.APPROVED) {
      await blockUpload('Identity already verified.');
    }

    if (verification?.status === VerificationStatus.PENDING && verification.id_card_url) {
      await blockUpload('Verification request already pending.');
    }

    if (verification) {
      verification.id_card_url = dto.id_card_url;
      verification.selfie_url = dto.selfie_url;
      verification.status = VerificationStatus.PENDING;
      verification.rejection_reason = null;
      return await this.verificationRepo.save(verification);
    }

    const newRequest = this.verificationRepo.create({
      user_id: userId,
      id_card_url: dto.id_card_url,
      selfie_url: dto.selfie_url,
      status: VerificationStatus.PENDING,
    });

    return await this.verificationRepo.save(newRequest);
  }

  async review(id: number, adminId: number, dto: ReviewVerificationDto) {
    const admin = await this.userRepo.findOne({ where: { id: adminId } });
    if (!admin) throw new ForbiddenException('Invalid Admin performing review.');

    return await this.dataSource.transaction(async (manager) => {
      const verification = await manager.findOne(IdentityVerificationEntity, { 
        where: { id },
        lock: { mode: 'pessimistic_write' } 
      });

      if (!verification) throw new NotFoundException('Request not found');
      
      if (verification.status === dto.status) {
        throw new BadRequestException(`Request is already ${dto.status}.`);
      }

      if (dto.status === VerificationStatus.APPROVED && !verification.id_card_url) {
        throw new BadRequestException('Cannot approve: Files were deleted.');
      }

      if (dto.status === VerificationStatus.REJECTED) {
        if (!dto.rejection_reason?.trim()) {
          throw new BadRequestException('Rejection reason required.');
        }
        await this.deletePhysicalFiles([verification.id_card_url, verification.selfie_url]);
        verification.id_card_url = null;
        verification.selfie_url = null;
      }

      verification.status = dto.status;
      verification.reviewed_by = adminId;
      verification.reviewed_at = new Date();
      verification.rejection_reason = dto.status === VerificationStatus.REJECTED ? dto.rejection_reason : null;
      await manager.save(verification);

      await manager.update(UserEntity, verification.user_id, {
        isIdentityVerified: dto.status === VerificationStatus.APPROVED,
      });

      const auditLog = manager.create(AuditLogEntity, {
        action: dto.status,
        reason: dto.rejection_reason ?? undefined, 
        targetUserId: verification.user_id,
        adminId: adminId,
      });
      await manager.save(auditLog);

      const isApproved = dto.status === VerificationStatus.APPROVED;
      await this.notificationsService.createNotification({
        user_id: verification.user_id,
        audience: 'user',
        title: isApproved ? 'Identity Verified' : 'Status Updated',
        message: isApproved ? 'Your identity is verified!' : `Rejected: ${dto.rejection_reason}`,
        type: isApproved ? 'APPLICATION_ACCEPTED' : 'APPLICATION_REJECTED',
      });

      return verification;
    });
  }

  async resetToPending(id: number, adminId: number) {
    const verification = await this.verificationRepo.findOne({ where: { id } });
    if (!verification) throw new NotFoundException('Request not found');

    return await this.dataSource.transaction(async (manager) => {
      await this.deletePhysicalFiles([verification.id_card_url, verification.selfie_url]);
      
      await manager.update(UserEntity, verification.user_id, {
        isIdentityVerified: false,
      });

      verification.status = VerificationStatus.PENDING;
      verification.id_card_url = null;
      verification.selfie_url = null;
      verification.rejection_reason = null;
      verification.reviewed_at = null as any; 
      verification.reviewed_by = null as any;
      await manager.save(verification);

      const auditLog = manager.create(AuditLogEntity, {
        action: 'RESET_TO_PENDING',
        reason: 'Admin manually reset verification to pending.',
        targetUserId: verification.user_id,
        adminId: adminId,
      });
      await manager.save(auditLog);

      return { message: 'Reset successful' };
    });
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
        const errorMessage = err instanceof Error ? err.message : String(err);
        if ((err as any).code === 'ENOENT') {
          this.logger.warn(`File not found: ${filePath}`);
        } else {
          this.logger.error(`Failed to delete file: ${errorMessage}`);
        }
      }
    }
  }
}