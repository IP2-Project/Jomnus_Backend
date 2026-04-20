import { Controller, Get, Patch, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getMyNotifications(@Request() req) {
    return this.notificationsService.getUserNotifications(req.user.id);
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id', ParseIntPipe) id: number, 
    @Request() req
  ) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Patch('read-all')
  async markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }
}