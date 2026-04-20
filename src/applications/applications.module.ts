import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './entities/application.entity';
import { TasksModule } from '@/tasks/tasks.module';
import { AssignmentsModule } from '@/assignments/assignments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application]),
    TasksModule,
    AssignmentsModule
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
