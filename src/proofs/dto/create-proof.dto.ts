import { IsNotEmpty, IsNumber, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ProofType } from '../entities/task-proof.entity';

export class CreateProofDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  assignment_id!: number;

  @IsNotEmpty()
  @IsEnum(ProofType)
  type!: ProofType;

  @IsOptional()
  @IsString()
  file_url?: string;

  @IsOptional()
  @IsString()
  text_content?: string;
}