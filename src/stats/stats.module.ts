import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerformerStats } from './entities/performer-stats.entity';
import { RequesterStats } from './entities/requester-stats.entity';
import { StatsService } from './stats.service';

@Module({
    imports: [
    TypeOrmModule.forFeature([
      PerformerStats,
      RequesterStats,
    ]),
  ],
  providers: [StatsService],
  exports: [StatsService], // IMPORTANT
})
export class StatsModule {}
