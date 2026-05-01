import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityVerificationEntity } from './entities/identity-verification.entity';
import { AuditLogEntity } from './entities/audit-log.entity'; // 👈 Import the new entity
import { UserEntity } from '@/users/entity/user.entity';
import { IdentityVerificationsService } from './identity-verifications.service';
import { IdentityVerificationsController } from './identity-verifications.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IdentityVerificationEntity, 
      UserEntity, 
      AuditLogEntity // 👈 Add this here to register the repository
    ]),
    NotificationsModule,
  ],
  controllers: [IdentityVerificationsController],
  providers: [IdentityVerificationsService],
  exports: [IdentityVerificationsService],
})
export class IdentityVerificationsModule {}