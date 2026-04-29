import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerformerStats } from './entities/performer-stats.entity';
import { RequesterStats } from './entities/requester-stats.entity';
import { UserEntity } from '@/users/entity/user.entity';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PerformerStats,
      RequesterStats,
      UserEntity, // ✅ MUST BE HERE
    ]),
    // UsersModule,

  ],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}