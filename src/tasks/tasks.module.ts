import { Module } from '@nestjs/common';
import { TasksController } from './task.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from './entities/task.entity';
import { TasksService } from './tasks.service';
import { TaskCategory } from '@/categories/entities/task-category.entity';
import { CategoryEntity } from '@/categories/entities/category.entity';
import { CategoriesModule } from '@/categories/categories.module';
import { ConversationsEntity } from '@/conversations/entity/conversations.entity';
import { StatsModule } from '@/stats/stats.module';
import { TaskApplicationEntity } from '@/applications/entities/task-application.entity';
import { StatsModule } from '@/stats/stats.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([TaskEntity, TaskCategory, CategoryEntity, ConversationsEntity, TaskApplicationEntity]),

        CategoriesModule,
        StatsModule,
    ],
    controllers: [TasksController],
    providers: [TasksService],
    exports: [TasksService]
})
export class TasksModule {}
