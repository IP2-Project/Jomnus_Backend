import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  assignment_id!: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  reviewer_id!: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  reviewee_id!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  reliability!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  speed!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  communication!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  accuracy!: number;

  @IsNotEmpty()
  comment!: string;
}