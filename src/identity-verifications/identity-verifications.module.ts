import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityVerificationEntity } from './entities/identity-verification.entity';
import { UserEntity } from '@/users/entity/user.entity';
import { IdentityVerificationsService } from './identity-verifications.service';
import { IdentityVerificationsController } from './identity-verifications.controller';
import { NotificationsModule } from '../notifications/notifications.module'; // 👈 Adjust path as needed

@Module({
  imports: [
    TypeOrmModule.forFeature([IdentityVerificationEntity, UserEntity]),
    NotificationsModule, // 👈 Added this to allow cross-module communication
  ],
  controllers: [IdentityVerificationsController],
  providers: [IdentityVerificationsService],
  exports: [IdentityVerificationsService],
})
export class IdentityVerificationsModule {}