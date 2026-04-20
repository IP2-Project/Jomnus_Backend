import { IsNotEmpty, IsString, IsNumber, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty()
  @IsString()
  assignment_id: string;

  @IsNotEmpty()
  @IsString()
  reviewer_id: string;

  @IsNotEmpty()
  @IsString()
  reviewee_id: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsNotEmpty()
  @IsNumber()
  reliability: number;

  @IsNotEmpty()
  @IsNumber()
  speed: number;

  @IsNotEmpty()
  @IsNumber()
  communication: number;

  @IsNotEmpty()
  @IsNumber()
  accuracy: number;

  @IsNotEmpty()
  @IsString()
  comment: string;
}
