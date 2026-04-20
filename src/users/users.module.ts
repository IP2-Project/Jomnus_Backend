import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@/auth/entity/user.entity';
import { StatsModule } from '@/stats/stats.module';
import { User } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    StatsModule, // IMPORT stats here
  ],
  controllers: [UsersController],
  providers: [UsersService],

})
export class UsersModule {}
