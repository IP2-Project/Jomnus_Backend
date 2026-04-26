import { IsEnum, IsOptional, IsString } from 'class-validator';
import { VerificationStatus } from '../entities/identity-verification.entity';

export class ReviewVerificationDto {
  @IsEnum(VerificationStatus)
  status!: VerificationStatus;

  @IsString()
  @IsOptional()
  rejection_reason?: string;
}