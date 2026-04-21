import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageEntity } from './entity/messages.entity';
import { ConversationsService } from '@/conversations/conversations.service';
import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @Inject(forwardRef(() => ConversationsService))
    private conversationsService: ConversationsService,
  ) {}

  async createMessage(senderId: number, conversationId: number, text: string) {
    const messageText = text.trim();
    if (!messageText) {
      throw new BadRequestException('Message text cannot be empty');
    }

    const conversation =
      await this.conversationsService.ensureConversationAccess(
        conversationId,
        senderId,
      );

    const message = this.messageRepository.create({
      conversation_id: conversation.id,
      sender_id: senderId,
      message: messageText,
    });

    await this.messageRepository.save(message);

    return this.messageRepository.findOne({
      where: { id: message.id },
      relations: ['sender'],
    });
  }

  async getMessages(converstionId: number, userId: number) {
    await this.conversationsService.ensureConversationAccess(
      converstionId,
      userId,
    );

    return this.messageRepository.find({
      where: { conversation_id: converstionId },
      relations: ['sender'],
      order: { created_at: 'ASC' },
    });
  }
}
