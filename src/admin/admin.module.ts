import { Module, forwardRef } from '@nestjs/common'; // Added forwardRef
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@/users/entity/user.entity';
import { TaskAssignmentEntity } from '@/assignments/entities/assignment.entity';
import { TaskApplicationEntity } from '@/applications/entities/task-application.entity';
import { IdentityVerificationEntity } from '@/identity-verifications/entities/identity-verification.entity';
import { AuditLogEntity } from '@/identity-verifications/entities/audit-log.entity'; // Added Audit Log Entity Import
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
      AuditLogEntity, // 👈 FIXED: Registered AuditLogEntity so TypeORM can safely generate repositories for adminServices
      TaskEntity,
    ]),
    // Use forwardRef to guarantee NestJS doesn't lock up and skip admin routing registration
    forwardRef(() => IdentityVerificationsModule), 
  ],
  controllers: [adminController],
  providers: [adminServices],
  exports: [adminServices],
})
export class AdminModule {}