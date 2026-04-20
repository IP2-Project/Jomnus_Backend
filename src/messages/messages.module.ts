import { ConversationsModule } from '@/conversations/conversations.module';
import { Module } from '@nestjs/common';
import { MessageEntity } from './entity/messages.entity';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';
import { MessageController } from './message.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [TypeOrmModule.forFeature([MessageEntity]), ConversationsModule],
  controllers: [MessageController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
