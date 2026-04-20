import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import type { Request } from 'express';
import { UserEntity } from '@/users/entity/user.entity';
import { CreateMessageDto } from './dto/sent.message';

interface RequestWithUser extends Request {
  user: UserEntity;
}
@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
export class MessageController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a message in a conversation' })
  sendMessage(@Req() req: RequestWithUser, @Body() dto: CreateMessageDto) {
    return this.messagesService.createMessage(
      Number(req.user.id),
      dto.conversationId,
      dto.message,
    );
  }

  @Get(':conversationId')
  getMessages(
    @Req() req: RequestWithUser,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagesService.getMessages(
      Number(conversationId),
      Number(req.user.id),
    );
  }
}
