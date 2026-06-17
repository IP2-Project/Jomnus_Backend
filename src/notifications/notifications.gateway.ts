import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway {
  sendToAdmins(arg0: string, arg1: { message: string; title: string; }) {
    throw new Error('Method not implemented.');
  }
  @WebSocketServer()
  server!: Server;

  sendToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  sendToUser(userId: number, event: string, data: any) {
    this.server.emit(`${event}_${userId}`, data);
  }
}