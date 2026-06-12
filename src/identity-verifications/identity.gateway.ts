import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  },
})
export class IdentityGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private logger: Logger = new Logger('IdentityGateway');

  emitStatsUpdate(stats: any) {
    this.server.emit('identityStatsUpdated', stats);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Admin/Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Admin/Client disconnected: ${client.id}`);
  }
}
