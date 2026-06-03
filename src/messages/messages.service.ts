import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { MessageEntity } from './entity/messages.entity';
import { ConversationsService } from '@/conversations/conversations.service';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,

    @Inject(forwardRef(() => ConversationsService))
    private conversationsService: ConversationsService,
  ) {}

  async createMessage(
    senderId: number,
    conversationId: number,
    message: string,
    imageUrl?: string,
  ) {
    const conversation =
      await this.conversationsService.ensureConversationAccess(
        conversationId,
        senderId,
      );

    const text = message?.trim();

    if (!text && !imageUrl) {
      throw new BadRequestException('Message cannot be empty');
    }

    const newMessage = this.messageRepository.create({
      conversation_id: Number(conversationId),
      sender_id: senderId,
      message: text || '',
      image_url: imageUrl,
    });

    return await this.messageRepository.save(newMessage);
  }

  async getMessages(conversationId: number, userId: number) {
    await this.conversationsService.ensureConversationAccess(
      conversationId,
      userId,
    );

    return this.messageRepository.find({
      where: { conversation_id: conversationId },
      relations: ['sender'],
      order: { created_at: 'ASC' },
    });
  }
}
