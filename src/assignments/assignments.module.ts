import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskAssignmentEntity } from './entities/assignment.entity';
import { TaskEntity } from '@/tasks/entities/task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TaskAssignmentEntity, TaskEntity])],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService]
})
export class AssignmentsModule {}
