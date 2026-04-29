import { BadRequestException, Injectable } from '@nestjs/common';
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
      throw new BadRequestException(
        'Review for this assignment already exists.',
      );
    }

    const review = this.reviewRepository.create(createReviewDto);

    return this.reviewRepository.save(review);
  }

  async getReviewsByRevieweeId(revieweeId: number): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { reviewee_id: revieweeId },
      relations: ['reviewer', 'reviewee'],
      order: {
        created_at: 'DESC',
      },
    });
  }

  async getAllReviews(): Promise<Review[]> {
    const reviews = await this.reviewRepository.find({
      relations: ['reviewer', 'reviewee'],
      order: {
        created_at: 'DESC',
      },
    });

    return reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      assignment_id: review.assignment_id,

      reviewerName: review.reviewer?.fullName,
      reviewerImage: review.reviewer?.profileImage,

      revieweeName: review.reviewee?.fullName,
    })) as unknown as Review[];
  }

  async updateReview(
    id: number,
    updateData: Partial<CreateReviewDto>,
  ): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id },
    });

    if (!review) {
      throw new BadRequestException('Review not found');
    }

    // merge old + new data
    Object.assign(review, updateData);

    return this.reviewRepository.save(review);
  }
}
