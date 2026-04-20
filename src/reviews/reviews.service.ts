import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async createReview(createReviewDto: CreateReviewDto): Promise<Review> {
    const existingReview = await this.reviewRepository.findOne({
      where: { assignment_id: createReviewDto.assignment_id },
    });

    if (existingReview) {
      throw new Error('Review for this assignment already exists.');
    }

    const review = this.reviewRepository.create(createReviewDto);
    return await this.reviewRepository.save(review);
  }

  async getReviewsByRevieweeId(revieweeId: string): Promise<Review[]> {
    return await this.reviewRepository.find({ where: { reviewee_id: revieweeId } });
  }
}
