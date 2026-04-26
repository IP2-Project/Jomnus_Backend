import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityVerificationEntity, VerificationStatus } from './entities/identity-verification.entity';
import { UserEntity } from '@/users/entity/user.entity';
import { ReviewVerificationDto } from './dto/review-verification.dto';

@Injectable()
export class IdentityVerificationsService {
  constructor(
    @InjectRepository(IdentityVerificationEntity)
    private readonly verificationRepo: Repository<IdentityVerificationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async review(id: number, adminId: number, dto: ReviewVerificationDto) {
    // 1. Find the verification request
    const verification = await this.verificationRepo.findOne({ where: { id } });
    if (!verification) throw new NotFoundException('Verification request not found');

    // 2. Find the user associated with the request
    const user = await this.userRepo.findOne({ where: { id: verification.user_id } });
    if (!user) throw new NotFoundException('User not found');

    // 🛡️ Logic: Reason must be provided for Rejection
    // This part is safe because it uses the DTO, not the DB schema
    if (dto.status === VerificationStatus.REJECTED && (!dto.rejection_reason || dto.rejection_reason.trim() === '')) {
      throw new BadRequestException('A rejection reason must be provided when rejecting.');
    }

    // 3. Update verification record
    verification.status = dto.status;
    verification.reviewed_by = adminId;
    verification.reviewed_at = new Date();

    if (dto.status === VerificationStatus.REJECTED) {
      verification.rejection_reason = dto.rejection_reason;
    } else {
      // Clear rejection reason if moving to APPROVED or PENDING
      verification.rejection_reason = null; 
    }

    // Save verification changes
    await this.verificationRepo.save(verification);

    // 4. Sync user identity status
    // This updates the existing 'isIdentityVerified' column in the original entity
    await this.userRepo.update(user.id, {
      isIdentityVerified: dto.status === VerificationStatus.APPROVED,
    });

    return verification;
  }
}