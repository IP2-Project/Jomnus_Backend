import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { TaskEntity } from '@/tasks/entities/task.entity';
import { TaskAssignmentEntity } from '@/assignments/entities/assignment.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,

    @InjectRepository(TaskAssignmentEntity)
    private readonly assignmentRepository: Repository<TaskAssignmentEntity>,

    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
  ) {}

  // ✅ CREATE REVIEW (no change needed)
  async createReview(dto: CreateReviewDto, userId: number): Promise<Review> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: dto.assignment_id },
    });

    if (!assignment) {
      throw new BadRequestException('Assignment not found');
    }

    const task = await this.taskRepository.findOne({
      where: { id: assignment.task_id },
    });

    if (!task) {
      throw new BadRequestException('Task not found');
    }

    let revieweeId: number;

    if (task.requester_id === userId) {
      revieweeId = assignment.performer_id;
    } else if (assignment.performer_id === userId) {
      revieweeId = task.requester_id;
    } else {
      throw new BadRequestException('You are not part of this assignment');
    }

    const existingReview = await this.reviewRepository.findOne({
      where: {
        assignment_id: dto.assignment_id,
        reviewer_id: userId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('You already reviewed this assignment');
    }

    const review = this.reviewRepository.create({
      ...dto,
      reviewer_id: userId,
      reviewee_id: revieweeId,
    });
    

    return this.reviewRepository.save(review);
  }

  // 🔥 FIXED: Reviews ABOUT me (for your UI)
  async getReviewsAboutMe(userId: number): Promise<any[]> {
    const reviews = await this.reviewRepository.find({
      where: { reviewee_id: userId },
      relations: ['reviewer'],
      order: { created_at: 'DESC' },
    });

    return reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      assignment_id: review.assignment_id,

      // ✅ FIX: flatten relation
      reviewerName: review.reviewer?.fullName || 'Unknown',
      reviewerImage: review.reviewer?.profileImage || null,
    }));
  }

  // 🔥 FIXED: Reviews I gave (optional page)
  async getReviewsIGave(userId: number): Promise<any[]> {
    const reviews = await this.reviewRepository.find({
      where: { reviewer_id: userId },
      relations: ['reviewee'],
      order: { created_at: 'DESC' },
    });

    return reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      assignment_id: review.assignment_id,

      revieweeName: review.reviewee?.fullName || 'Unknown',
    }));
  }

  // ⚠️ keep only if needed (admin/debug)
  async getAllReviews(): Promise<any[]> {
    const reviews = await this.reviewRepository.find({
      relations: ['reviewer', 'reviewee'],
      order: { created_at: 'DESC' },
    });

    return reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      assignment_id: review.assignment_id,

      reviewerName: review.reviewer?.fullName,
      revieweeName: review.reviewee?.fullName,
    }));
  }

  // ✅ UPDATE (already correct)
  async updateReview(
    id: number,
    updateData: Partial<CreateReviewDto>,
    userId: number,
  ): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id },
    });

    if (!review) {
      throw new BadRequestException('Review not found');
    }

    if (review.reviewer_id !== userId) {
      throw new BadRequestException(
        'You are not allowed to update this review',
      );
    }

    Object.assign(review, updateData);

    return this.reviewRepository.save(review);
  }
}
