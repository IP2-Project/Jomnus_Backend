import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProofsController } from './proofs.controller';
import { ProofsService } from './proofs.service';
import { Proof } from './entities/task-proof.entity';
import { TaskAssignmentEntity } from '@/assignments/entities/assignment.entity';
import { TaskEntity } from '@/tasks/entities/task.entity';
import { NotificationsModule } from '@/notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Proof, TaskAssignmentEntity, TaskEntity]), NotificationsModule],
  controllers: [ProofsController],
  providers: [ProofsService],
})
export class ProofsModule {}
