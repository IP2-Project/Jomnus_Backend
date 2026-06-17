import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.getway';
import { MessagesModule } from '@/messages/messages.module';
import { ConversationsModule } from '@/conversations/conversations.module';

@Module({
  imports: [
    JwtModule.register({}),
    forwardRef(() => MessagesModule),
    ConversationsModule,
  ],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatModule {}
