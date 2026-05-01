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
    origin: '*', // For development. In production, use your frontend URL.
  },
})
export class IdentityGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private logger: Logger = new Logger('IdentityGateway');

  // This method will be called by the Service to push data to admins
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