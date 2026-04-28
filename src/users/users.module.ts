import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entity/user.entity';
import { StatsModule } from '@/stats/stats.module';
// Import the IdentityVerificationEntity
import { IdentityVerificationEntity } from '@/identity-verifications/entities/identity-verification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity, 
      IdentityVerificationEntity // <--- ADD THIS HERE
    ]),
    StatsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}