import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageEntity } from './entity/messages.entity';
import { MessageController } from './message.controller';
import { MessagesService } from './messages.service';
import { ConversationsModule } from '@/conversations/conversations.module';
import { ChatModule } from '@/chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageEntity]),
    forwardRef(() => ConversationsModule),
    forwardRef(() => ChatModule),
  ],
  providers: [MessagesService],
  controllers: [MessageController],
  exports: [MessagesService],
})
export class MessagesModule {}
