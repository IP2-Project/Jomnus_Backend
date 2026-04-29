import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsDateString, IsArray } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  categoryIds?: number[];

  @IsOptional()
  @IsString()
  locationText?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @Type(() => Number)
  @IsNumber()
  price!: number;

  @IsDateString()
  deadline!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  requiredWorkers?: number;
}