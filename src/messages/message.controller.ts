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
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messagesService: MessagesService) {}



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

    return this.messagesService.createMessage(
      req.user.id,
      Number(dto.conversationId),
      dto.message,
      imageUrl,
    );

  }


  @Get(':conversationId')
  getMessages(@Req() req: any, @Param('conversationId') id: string) {
    return this.messagesService.getMessages(Number(id), req.user.id);
  }
}
