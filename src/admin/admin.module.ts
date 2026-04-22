import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Injectable } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { ApplicationsModule } from '../applications/applications.module';
import { AssignmentsModule } from '../assignments/assignments.module';

@Module({
  imports: [TasksModule, ApplicationsModule, AssignmentsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
