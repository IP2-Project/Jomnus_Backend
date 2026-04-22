import { Module } from '@nestjs/common';
import { UserService } from './users.service';
import { UserController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entity/user.entity';
import { StatsModule } from '@/stats/stats.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    StatsModule, // IMPORT stats here
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService]

})
export class UsersModule {}
