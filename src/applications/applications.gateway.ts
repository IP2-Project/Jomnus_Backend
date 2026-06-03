import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export type ApplicationUpdateEvent = {
  type:
    | 'created'
    | 'accepted'
    | 'rejected'
    | 'cancelled'
    | 'bulk_rejected';
  applicationId?: number;
  taskId?: number;
  status?: string;
  message?: string;
};

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  },
})
export class ApplicationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private logger = new Logger('ApplicationsGateway');

  emitApplicationsUpdate(payload: ApplicationUpdateEvent) {
    this.server.emit('applications:updated', payload);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }
}
