<<<<<<< HEAD
import { Module, forwardRef } from '@nestjs/common';
=======
import { Module, forwardRef } from '@nestjs/common'; // Added forwardRef
>>>>>>> 7dda4b8 (feat: update admin controllers, admin module,admin.service, and entity for identity verification, service and also user.entity)
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@/users/entity/user.entity';
import { TaskAssignmentEntity } from '@/assignments/entities/assignment.entity';
import { TaskApplicationEntity } from '@/applications/entities/task-application.entity';
import { IdentityVerificationEntity } from '@/identity-verifications/entities/identity-verification.entity';
import { AuditLogEntity } from '@/identity-verifications/entities/audit-log.entity';
import { TaskEntity } from '@/tasks/entities/task.entity';
import { adminServices } from './admin.service';
import { adminController } from './admin.controller';
import { IdentityVerificationsModule } from '@/identity-verifications/identity-verifications.module';
import { UsersModule } from '@/users/users.module'; // 👈 Added UsersModule import

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      TaskAssignmentEntity,
      TaskApplicationEntity,
      IdentityVerificationEntity,
      AuditLogEntity,
      TaskEntity,
    ]),
    // Guarantees NestJS doesn't encounter circular dependency freezes
    forwardRef(() => IdentityVerificationsModule), 
    forwardRef(() => UsersModule), // 👈 Added: Exports UsersService out to the Admin Controller
  ],
  controllers: [adminController],
  providers: [adminServices],
  exports: [adminServices],
})
export class AdminModule {}