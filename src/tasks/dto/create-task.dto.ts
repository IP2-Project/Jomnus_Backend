import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber({}, { each: true })
  categoryIds?: number[];

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