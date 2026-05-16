import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerformerStats } from './entities/performer-stats.entity';
import { RequesterStats } from './entities/requester-stats.entity';
import { UserEntity } from '@/users/entity/user.entity';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { UsersModule } from '@/users/users.module';
import { UsersService } from '@/users/users.service';
import { PerformerStatsService } from './performer-stats.service';
import { RequesterStatsService } from './requester-stats.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PerformerStats,
      RequesterStats,
      UserEntity, 
    ]),
    // Use forwardRef just in case UsersModule also imports StatsModule
    forwardRef(() => UsersModule), 
  ],
  controllers: [StatsController],
  providers: [StatsService, RequesterStatsService, PerformerStatsService],
  exports: [StatsService, RequesterStatsService, PerformerStatsService],
})
export class StatsModule {}