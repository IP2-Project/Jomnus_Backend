import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { MessagesService } from './messages.service';
import { ChatGateway } from '@/chat/chat.getway';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard';
import { MessageType } from './entity/messages.entity';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/messages',
        filename: (req, file, cb) => {
          const unique =
            Date.now() + '-' + Math.random().toString(36).substring(2);
          cb(null, unique + extname(file.originalname));
        },
      }),
    }),
  )
  async sendMessage(
    @Req() req: any,
    @Body() dto: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imageUrl = file ? `/uploads/messages/${file.filename}` : undefined;
    const messageType = imageUrl ? MessageType.IMAGE : MessageType.TEXT;
    const saved = await this.messagesService.createMessage(
      req.user.id,
      Number(dto.conversationId),
      dto.message,
      imageUrl,
      messageType,
    );

    const full = await this.messagesService.getMessageById(saved.id);

    this.chatGateway.server
      .to(`conversation_${dto.conversationId}`)
      .emit('message:new', full);

    return full;
  }

  @Get(':conversationId')
  getMessages(@Req() req: any, @Param('conversationId') id: string) {
    return this.messagesService.getMessages(Number(id), req.user.id);
  }
}
