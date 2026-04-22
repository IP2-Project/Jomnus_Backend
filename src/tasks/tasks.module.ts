import { Module } from '@nestjs/common';
import { TasksController } from './task.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from './entities/task.entity';
import { TasksService } from './tasks.service';
import { TaskCategory } from '@/categories/entities/task-category.entity';
import { Category } from '@/categories/entities/category.entity';
import { CategoriesModule } from '@/categories/categories.module';
import { ConversationsEntity } from '@/conversations/entity/conversations.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([TaskEntity, TaskCategory, Category, ConversationsEntity]),
        CategoriesModule
    ],
    controllers: [TasksController],
    providers: [TasksService],
    exports: [TasksService]
})
@Module({
  providers: [TasksService],
  exports: [TasksService], 
})
export class TasksModule {}
