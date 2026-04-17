import { Module } from '@nestjs/common';
import { ConversationsEntity } from './entity/conversations.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { MessageEntity } from '@/messages/entity/messages.entity';
import { TasksEntity } from '@/tasks/entity/tasks.entity';
import { task_applicationsEntity } from '@/task_applications/entity/task_applications.entity';
import { task_assignmentEntity } from '@/task_assingment/entity/task-assignment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConversationsEntity,
      MessageEntity,
      TasksEntity,
      task_assignmentEntity,
      task_applicationsEntity,
    ]),
  ],
  providers: [ConversationsService],
  controllers: [ConversationsController],
  exports: [ConversationsService],
})
export class ConversationsModule {}
