import { ConversationsModule } from '@/conversations/conversations.module';
import { MessagesModule } from '@/messages/messages.module';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.getway';

@Module({
  imports: [JwtModule.register({}), ConversationsModule, MessagesModule],
  providers: [ChatGateway],
})
export class ChatModule {}
