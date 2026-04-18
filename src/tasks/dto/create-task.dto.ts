import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  categoryId: number;

  @IsOptional()
  @IsString()
  locationText?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsNumber()
  price: number;

  @IsDateString()
  deadline: string;

  @IsOptional()
  @IsNumber()
  requiredWorkers?: number;
}