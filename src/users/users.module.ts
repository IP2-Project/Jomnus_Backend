import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entity/user.entity';
import { StatsModule } from '@/stats/stats.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    StatsModule, // IMPORT stats here
  ],
  controllers: [UsersController],
  providers: [UsersService],

})
export class UsersModule {}
