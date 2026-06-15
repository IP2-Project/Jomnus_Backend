import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { UserEntity } from '../users/entity/user.entity';
import { NotificationsGateway } from './notifications.gateway';
@Module({
  imports: [TypeOrmModule.forFeature([Notification, UserEntity])],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService, NotificationsGateway], 
})
export class NotificationsModule {}