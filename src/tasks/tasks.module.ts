import { Controller, Module } from '@nestjs/common';
import { TasksController } from './task.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { TasksService } from './tasks.service';
import { TaskCategory } from '@/categories/entities/task-category.entity';
import { CategoriesService } from '@/categories/categories.service';
import { Category } from '@/categories/entities/category.entity';
import { CategoriesModule } from '@/categories/categories.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Task, TaskCategory, Category]),
        CategoriesModule
    ],
    controllers: [TasksController],
    providers: [TasksService],
    exports: [TasksService]
})
export class TasksModule {}
