import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { Review } from './entities/review.entity';
import { TaskAssignmentEntity } from '@/assignments/entities/assignment.entity';
import { TaskEntity } from '@/tasks/entities/task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, TaskAssignmentEntity, TaskEntity]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
