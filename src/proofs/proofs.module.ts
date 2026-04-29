import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProofsController } from './proofs.controller';
import { ProofsService } from './proofs.service';
import { Proof } from './entities/task-proof.entity';
import { TaskAssignmentEntity } from '@/assignments/entities/assignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Proof, TaskAssignmentEntity])],
  controllers: [ProofsController],
  providers: [ProofsService],
})
export class ProofsModule {}
