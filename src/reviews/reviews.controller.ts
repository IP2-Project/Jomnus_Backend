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
  Req,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  async createReview(@Body() dto: CreateReviewDto, @Req() req) {
    try {
      return await this.reviewsService.createReview(dto, req.user.id);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to create review',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('me')
  getMyReviews(@Req() req) {
    return this.reviewsService.getReviewsAboutMe(req.user.id);
  }

  @Get('given')
  getReviewsIGave(@Req() req) {
    return this.reviewsService.getReviewsIGave(req.user.id);
  }

  @Get()
  async getAllReviews(@Req() req) {
    // you can later add admin check here
    return this.reviewsService.getAllReviews();
  }

  @Patch(':id')
  async updateReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<CreateReviewDto>,
    @Req() req,
  ) {
    try {
      return await this.reviewsService.updateReview(
        id,
        updateData,
        req.user.id,
      );
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to update review',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
