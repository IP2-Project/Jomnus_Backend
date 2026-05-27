import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entity/user.entity';
import { StatsModule } from '@/stats/stats.module';
// 1. Import the actual Module, not just the entity
import { IdentityVerificationsModule } from '@/identity-verifications/identity-verifications.module';
import { UsersCleanupService } from './users-cleanup.service';



@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    forwardRef(() => StatsModule), // 👈 Use forwardRef here
    forwardRef(() => IdentityVerificationsModule), // 👈 Use forwardRef here
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersCleanupService],
  exports: [UsersService]
})
export class UsersModule {}