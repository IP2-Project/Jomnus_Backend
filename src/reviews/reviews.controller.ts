
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpException,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  async createReview(@Body() createReviewDto: CreateReviewDto) {
    try {
      return await this.reviewsService.createReview(createReviewDto);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to create review',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  async getAllReviews() {
    return this.reviewsService.getAllReviews();
  }

  @Get(':revieweeId')
  async getReviewsByRevieweeId(
    @Param('revieweeId', ParseIntPipe) revieweeId: number,
  ) {
    return this.reviewsService.getReviewsByRevieweeId(revieweeId);
  }

  @Patch(':id')
  async updateReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<CreateReviewDto>,
  ) {
    try {
      return await this.reviewsService.updateReview(id, updateData);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to update review',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
