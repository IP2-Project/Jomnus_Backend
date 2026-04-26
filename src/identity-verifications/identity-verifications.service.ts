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

  // --- ADDED: Fetch all pending requests with user details ---
  async getPendingList() {
    return await this.verificationRepo.find({
      where: { status: VerificationStatus.PENDING },
      relations: ['user'], // Ensures the user info is attached to each record
      order: { created_at: 'ASC' }, // Oldest first
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

    return verification;
  }
}