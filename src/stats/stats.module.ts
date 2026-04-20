import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerformerStats } from './entities/performer-stats.entity';
import { RequesterStats } from './entities/requester-stats.entity';
import { UserProfile } from './entities/user-profile.entity';
import { StatsService } from './stats.service';

@Module({
    imports: [
    TypeOrmModule.forFeature([
      PerformerStats,
      RequesterStats,
      UserProfile,
    ]),
  ],
  providers: [StatsService],
  exports: [StatsService], // IMPORTANT
})
export class StatsModule {}
