import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityVerificationEntity } from './entities/identity-verification.entity';
import { AuditLogEntity } from './entities/audit-log.entity';
import { UserEntity } from '@/users/entity/user.entity';
import { IdentityVerificationsService } from './identity-verifications.service';
import { IdentityVerificationsController } from './identity-verifications.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { IdentityGateway } from './identity.gateway';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IdentityVerificationEntity, 
      UserEntity, 
      AuditLogEntity 
    ]),
    NotificationsModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [IdentityVerificationsController],
  providers: [IdentityVerificationsService, IdentityGateway],
  exports: [IdentityVerificationsService, TypeOrmModule], 
})
export class IdentityVerificationsModule {}