import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConversationsService } from '@/conversations/conversations.service';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { MessagesService } from '@/messages/messages.service';
import { MessageType } from '@/messages/entity/messages.entity';


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
  public server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
    @Inject(forwardRef(() => ConversationsService)) // ← forwardRef here too
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
        role: (payload as any).currentRole || (payload as any).role,
      };

      client.join(`user_${client.data.user.id}`);
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
    const userId = client.data.user?.id;
    if (!userId) throw new WsException('Unauthorized');

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
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; message: string },
  ) {
    const userId = client.data.user?.id;
    if (!userId) throw new WsException('Unauthorized');

    try {
      const saved = await this.messagesService.createMessage(
        userId,
        data.conversationId,
        data.message ?? '',
        undefined,
        MessageType.TEXT
      );

      const full = await this.messagesService.getMessageById(saved.id);

      this.server
        .to(`conversation_${data.conversationId}`)
        .emit('message:new', full);

      return { event: 'message:sent', data: full };
    } catch (err: any) {
      return { event: 'chat:error', data: { message: err.message } };
    }
  }

  @SubscribeMessage('conversation:leave')
  async leaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: number },
  ) {
    const userId = client.data.user?.id;
    if (!userId) throw new WsException('Unauthorized');

    client.leave(`conversation_${body.conversationId}`);

    return {
      event: 'conversation:left',
      data: { conversationId: body.conversationId },
    };
  }

  @SubscribeMessage('call:initiate')
  async handleCallInitiate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; targetUserId: number; isVideo: boolean },
  ) {
    const userId = client.data.user?.id;
    if (!userId) throw new WsException('Unauthorized');
    await this.conversationsService.ensureConversationAccess(data.conversationId, userId);
    this.server.to(`user_${data.targetUserId}`).emit('call:incoming', {
      conversationId: data.conversationId,
      callerId: userId,
      isVideo: data.isVideo,
    });
  }

  @SubscribeMessage('call:signal')
  async handleCallSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; targetUserId: number; signalData: any },
  ) {
    const userId = client.data.user?.id;
    if (!userId) throw new WsException('Unauthorized');
    this.server.to(`user_${data.targetUserId}`).emit('call:signal', {
      senderId: userId,
      signalData: data.signalData,
    });
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; targetUserId: number; duration?: number },
  ) {
    const userId = client.data.user?.id;
    if (!userId) throw new WsException('Unauthorized');

    this.server.to(`user_${data.targetUserId}`).emit('call:ended', { conversationId: data.conversationId });

    if (data.duration && data.duration > 0) {
      const logMessage = `Call ended. Duration: ${Math.floor(data.duration / 60)}m ${data.duration % 60}s`;
      const saved = await this.messagesService.createMessage(
        userId,
        data.conversationId,
        logMessage,
        undefined,
        MessageType.CALL_LOG,
        data.duration,
      );
      const full = await this.messagesService.getMessageById(saved.id);
      this.server.to(`conversation_${data.conversationId}`).emit('message:new', full);
    }
  }
}
