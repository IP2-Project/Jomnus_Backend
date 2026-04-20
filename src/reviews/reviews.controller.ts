import { Controller, Post, Get, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  async createReview(@Body() createReviewDto: CreateReviewDto) {
    try {
      return await this.reviewsService.createReview(createReviewDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':revieweeId')
  async getReviewsByRevieweeId(@Param('revieweeId') revieweeId: string) {
    try {
      return await this.reviewsService.getReviewsByRevieweeId(revieweeId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
