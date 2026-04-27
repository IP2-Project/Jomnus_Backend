import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm'; // Added MoreThanOrEqual
import { IdentityVerificationEntity, VerificationStatus } from './entities/identity-verification.entity';
import { UserEntity } from '@/users/entity/user.entity';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class IdentityVerificationsService {
  constructor(
    @InjectRepository(IdentityVerificationEntity)
    private readonly verificationRepo: Repository<IdentityVerificationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // --- NEW: Dashboard Stats Logic ---
  async getAdminStats() {
    // 1. Total Pending (for the "12 Pending Reviews" badge)
    const totalPending = await this.verificationRepo.count({
      where: { status: VerificationStatus.PENDING },
    });

    // 2. Processed Today (for the "45 processed today" stat)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const processedToday = await this.verificationRepo.count({
      where: {
        reviewed_at: MoreThanOrEqual(startOfToday),
      },
    });

    // 3. Recent Activity (for the right sidebar in Figma)
    const recentActivity = await this.verificationRepo.find({
      where: [
        { status: VerificationStatus.APPROVED },
        { status: VerificationStatus.REJECTED },
      ],
      order: { reviewed_at: 'DESC' },
      take: 5,
      relations: ['user'],
    });

    return { totalPending, processedToday, recentActivity };
  }

  async create(userId: number, dto: { id_card_url: string; selfie_url: string }) {
    const existingPending = await this.verificationRepo.findOne({
      where: {
        user_id: userId,
        status: VerificationStatus.PENDING
      },
    });

    if (existingPending) {
      throw new BadRequestException('You already have a verification request pending review.');
    }

    const newRequest = this.verificationRepo.create({
      user_id: userId,
      id_card_url: dto.id_card_url,
      selfie_url: dto.selfie_url,
      status: VerificationStatus.PENDING,
    });

    return await this.verificationRepo.save(newRequest);
  }

  async getPendingList() {
    return await this.verificationRepo.find({
      where: { status: VerificationStatus.PENDING },
      relations: ['user'],
      order: { created_at: 'ASC' },
    });
  }

  async review(id: number, adminId: number, dto: ReviewVerificationDto) {
    const verification = await this.verificationRepo.findOne({ where: { id } });
    if (!verification) throw new NotFoundException('Verification request not found');

    const user = await this.userRepo.findOne({ where: { id: verification.user_id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.status === VerificationStatus.REJECTED && (!dto.rejection_reason || dto.rejection_reason.trim() === '')) {
      throw new BadRequestException('A rejection reason must be provided when rejecting.');
    }

    verification.status = dto.status;
    verification.reviewed_by = adminId;
    verification.reviewed_at = new Date();

    if (dto.status === VerificationStatus.REJECTED) {
      verification.rejection_reason = dto.rejection_reason;
    } else {
      verification.rejection_reason = null;
    }

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