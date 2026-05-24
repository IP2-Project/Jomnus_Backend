import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from '@/messages/messages.service';
import { ConversationsService } from '@/conversations/conversations.service';

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  },
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly messagesService: MessagesService,
    private readonly conversationsService: ConversationsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });

      client.data.user = {
        id: Number((payload as any).sub),
        email: (payload as any).email,
        // role: (payload as any).role,
        role: (payload as any).currentRole || (payload as any).role,
      };
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {}

  @SubscribeMessage('conversation:join')
  async joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: number },
  ) {
    const userId = client.data.user.id;

    await this.conversationsService.ensureConversationAccess(
      body.conversationId,
      userId,
    );

    client.join(`conversation_${body.conversationId}`);

    return {
      event: 'conversation:joined',
      data: { conversationId: body.conversationId },
    };
  }

  @SubscribeMessage('message:send')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: number; message: string },
  ) {
    try {
      const userId = client.data.user.id;

      const savedMessage = await this.messagesService.createMessage(
        userId,
        body.conversationId,
        body.message,
      );

      this.server
        .to(`conversation_${body.conversationId}`)
        .emit('message:new', savedMessage);

      return {
        event: 'message:sent',
        data: savedMessage,
      };
    } catch (error: any) {
      client.emit('chat:error', {
        message: error.message || 'Failed to send message',
      });
    }
  }
}
