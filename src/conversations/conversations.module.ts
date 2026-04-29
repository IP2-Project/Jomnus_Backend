import { forwardRef, Module } from '@nestjs/common';
import { ConversationsEntity } from './entity/conversations.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { MessageEntity } from '@/messages/entity/messages.entity';
import { TaskEntity } from '@/tasks/entities/task.entity';
import { TaskApplicationEntity } from '@/applications/entities/task-application.entity';
import { TaskAssignmentEntity } from '@/assignments/entities/assignment.entity';
import { MessagesModule } from '@/messages/messages.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConversationsEntity,
      MessageEntity,
      TaskEntity,
      TaskApplicationEntity,
      TaskAssignmentEntity
    ]),
    forwardRef(() => MessagesModule)
  ],
  providers: [ConversationsService],
  controllers: [ConversationsController],
  exports: [ConversationsService],
})
export class ConversationsModule {}
