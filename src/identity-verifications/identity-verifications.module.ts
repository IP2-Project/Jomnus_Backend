import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityVerificationEntity } from './entities/identity-verification.entity';
import { UserEntity } from '@/users/entity/user.entity';
import { IdentityVerificationsService } from './identity-verifications.service';
import { IdentityVerificationsController } from './identity-verifications.controller';

@Module({
  imports: [
    // This connects the Database tables
    TypeOrmModule.forFeature([IdentityVerificationEntity, UserEntity]),
  ],
  controllers: [IdentityVerificationsController],
  providers: [IdentityVerificationsService],
  exports: [IdentityVerificationsService],
})
export class IdentityVerificationsModule {}