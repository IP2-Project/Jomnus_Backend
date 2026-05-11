import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@/users/entity/user.entity';
import { TaskAssignmentEntity } from '@/assignments/entities/assignment.entity';
import { TaskApplicationEntity } from '@/applications/entities/task-application.entity';
import { IdentityVerificationEntity } from '@/identity-verifications/entities/identity-verification.entity';
import { TaskEntity } from '@/tasks/entities/task.entity';
import { adminServices } from './admin.service';
import { adminController } from './admin.controller';
import { IdentityVerificationsModule } from '@/identity-verifications/identity-verifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      TaskAssignmentEntity,
      TaskApplicationEntity,
      IdentityVerificationEntity,
      TaskEntity,
    ]),
    IdentityVerificationsModule,
  ],
  controllers: [adminController],
  providers: [adminServices],
  exports: [adminServices],
})
export class AdminModule {}
