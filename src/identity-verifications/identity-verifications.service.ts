import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ForbiddenException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { IdentityVerificationEntity, VerificationStatus } from './entities/identity-verification.entity';
import { UserEntity } from '@/users/entity/user.entity';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { NotificationsService } from '../notifications/notifications.service';
import * as fs from 'fs/promises'; 
import * as path from 'path';

@Injectable()
export class IdentityVerificationsService {
  constructor(
    @InjectRepository(IdentityVerificationEntity)
    private readonly verificationRepo: Repository<IdentityVerificationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly notificationsService: NotificationsService,
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

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

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

    const recentActivity = await this.verificationRepo.find({
      where: [
        { status: VerificationStatus.APPROVED },
        { status: VerificationStatus.REJECTED },
      ],
      order: { reviewed_at: 'DESC' },
      take: 5,
      relations: ['user', 'reviewer'],
    });

    return { totalPending, processedToday, recentActivity };
  }

  async create(userId: number, dto: { id_card_url: string; selfie_url: string }) {
    let verification = await this.verificationRepo.findOne({
      where: { user_id: userId },
    });

    // --- HELPER: Delete files if request is blocked ---
    const cleanupFiles = async () => {
      try {
        if (dto.id_card_url) await fs.unlink(path.resolve(dto.id_card_url));
        if (dto.selfie_url) await fs.unlink(path.resolve(dto.selfie_url));
        console.log('Cleanup: Deleted files from blocked/duplicate request.');
      } catch (err: any) {
        console.warn(`Cleanup skipped: ${err.message}`);
      }
    };

    // 1. Block if already APPROVED
    if (verification && verification.status === VerificationStatus.APPROVED) {
      await cleanupFiles();
      throw new ForbiddenException(
        'Your identity is already verified. Changes are not allowed.'
      );
    }

    // 2. Block if already PENDING
    if (verification && verification.status === VerificationStatus.PENDING) {
      await cleanupFiles();
      throw new BadRequestException('You already have a verification request pending review.');
    }

    // 3. If record exists (was REJECTED), update it
    if (verification) {
      verification.id_card_url = dto.id_card_url;
      verification.selfie_url = dto.selfie_url;
      verification.status = VerificationStatus.PENDING;
      verification.rejection_reason = null;
      return await this.verificationRepo.save(verification);
    }

    // 4. Otherwise, create brand new row
    const newRequest = this.verificationRepo.create({
      user_id: userId,
      id_card_url: dto.id_card_url,
      selfie_url: dto.selfie_url,
      status: VerificationStatus.PENDING,
    });

    return await this.verificationRepo.save(newRequest);
  }

  async review(id: number, adminId: number, dto: ReviewVerificationDto) {
    const verification = await this.verificationRepo.findOne({ where: { id } });
    if (!verification) throw new NotFoundException('Verification request not found');

    const user = await this.userRepo.findOne({ where: { id: verification.user_id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.status === VerificationStatus.REJECTED && (!dto.rejection_reason || dto.rejection_reason.trim() === '')) {
      throw new BadRequestException('A rejection reason must be provided when rejecting.');
    }

    // --- REJECTION CLEANUP ---
    if (dto.status === VerificationStatus.REJECTED) {
      const files = [verification.id_card_url, verification.selfie_url];
      
      for (const fileUrlOrPath of files) {
        if (fileUrlOrPath) {
          let cleanPath = fileUrlOrPath;

          if (fileUrlOrPath.startsWith('http')) {
            const urlParts = fileUrlOrPath.split('/');
            cleanPath = urlParts.slice(3).join('/'); 
          }

          try {
            const absolutePath = path.resolve(cleanPath);
            await fs.unlink(absolutePath);
            console.log(`Successfully deleted obsolete file: ${absolutePath}`);
          } catch (err: any) {
            console.warn(`Cleanup skipped for ${cleanPath}: ${err.message}`);
          }
        }
      }
      
      verification.id_card_url = null;
      verification.selfie_url = null;
    }

    verification.status = dto.status;
    verification.reviewed_by = adminId;
    verification.reviewed_at = new Date();
    verification.rejection_reason = dto.status === VerificationStatus.REJECTED ? dto.rejection_reason : null;

    await this.verificationRepo.save(verification);

    await this.userRepo.update(user.id, {
      isIdentityVerified: dto.status === VerificationStatus.APPROVED,
    });

    const isApproved = dto.status === VerificationStatus.APPROVED;
    await this.notificationsService.createNotification({
      user_id: user.id,
      audience: 'user',
      title: isApproved ? 'Identity Verified' : 'Identity Verification Rejected',
      message: isApproved 
        ? 'Great news! Your identity has been successfully verified.' 
        : `Verification failed. Reason: ${dto.rejection_reason}`,
      type: isApproved ? 'APPLICATION_ACCEPTED' : 'APPLICATION_REJECTED',
    });

    return verification;
  }
}