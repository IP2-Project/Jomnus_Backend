import { Body, Controller, Req, UseGuards } from '@nestjs/common';
import { Get, Patch, Post, Delete } from '@nestjs/common';
import { UserEntity } from '@/users/entity/user.entity';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/conversations.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user: UserEntity;
}

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new conversation' })
  createConversation(
    @Req() req: RequestWithUser,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationsService.createConversation(
      dto.taskId,
      Number(req.user.id),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get my conversations' })
  getMyConversations(@Req() req: RequestWithUser) {
    return this.conversationsService.getMyConversations(Number(req.user.id));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one conversation' })
  getConversationById(
    @Req() req: RequestWithUser,
    @Body('id') conversationId: number,
  ) {
    return this.conversationsService.getConversationById(
      conversationId,
      Number(req.user.id),
    );
  }
}
