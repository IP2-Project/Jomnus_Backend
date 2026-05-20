import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskAssignmentEntity } from './entities/assignment.entity';
import { TaskEntity } from '@/tasks/entities/task.entity';
import { StatsModule } from '@/stats/stats.module';

@Module({
  imports: [TypeOrmModule.forFeature([TaskAssignmentEntity, TaskEntity]), StatsModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService]
})
export class AssignmentsModule {}
