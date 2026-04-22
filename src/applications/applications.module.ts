import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskApplicationEntity } from './entities/task-application.entity';
import { TasksModule } from '@/tasks/tasks.module';
import { AssignmentsModule } from '@/assignments/assignments.module';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskApplicationEntity]),
    TasksModule,
    AssignmentsModule,
    UsersModule
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
@Module({
  providers: [ApplicationsService],
  exports: [ApplicationsService], // ✅ THIS LINE FIXES EVERYTHING
})
export class ApplicationsModule {}
