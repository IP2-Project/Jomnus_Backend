import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class RejectVerificationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'Please provide a more detailed reason for rejection' })
  reason!: string;
}