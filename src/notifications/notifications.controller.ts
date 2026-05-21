import { Controller, Get, Patch, Param, UseGuards, Request, ParseIntPipe, ForbiddenException, Post, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('admin')
  async getAdminNotifications(@Request() req) {
    const userRole = req.user?.currentRole || req.user?.role;
    if (userRole !== 'ADMIN') {
      throw new ForbiddenException('Access denied. Admin privileges required.');
    }
    return this.notificationsService.getAdminNotifications();
  } 
  
  @Get()
  async getMyNotifications(@Request() req) {
    return this.notificationsService.getUserNotifications(req.user.id);
  }

  @Patch('read-all')
  async markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id', ParseIntPipe) id: number, 
    @Request() req
  ) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Post('broadcast')
  async broadcastNotification(
    @Request() req,
    @Body() dto: { title: string; message: string; type?: string }
  ) {
    const userRole = req.user?.currentRole || req.user?.role;
    if (userRole !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can send system-wide broadcasts.');
    }
    return this.notificationsService.broadcastToAll(dto.title, dto.message);
  }
  
}