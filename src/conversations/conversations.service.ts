import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationsEntity } from './entity/conversations.entity';
import { TasksEntity } from '@/tasks/entity/tasks.entity';
import { task_applicationsEntity } from '@/task_applications/entity/task_applications.entity';
import { MessageEntity } from '@/messages/entity/messages.entity';

import { task_assignmentEntity } from '@/task_assingment/entity/task-assignment.entity';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(ConversationsEntity)
    private readonly conversationRepository: Repository<ConversationsEntity>,
    @InjectRepository(TasksEntity)
    private readonly taskRepository: Repository<TasksEntity>,
    @InjectRepository(task_assignmentEntity)
    private readonly assignmentRepository: Repository<task_assignmentEntity>,
    @InjectRepository(task_applicationsEntity)
    private readonly applicationRepository: Repository<task_applicationsEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
  ) {}
  async createConversation(taskId: number, userId: number) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.ensureTaskChatAccess(taskId, userId);

    const existing = await this.conversationRepository.findOne({
      where: { task_id: taskId },
    });

    if (existing) {
      return this.getConversationById(existing.id, userId);
    }

    const conversation = this.conversationRepository.create({
      task_id: taskId,
    });

    await this.conversationRepository.save(conversation);

    return this.getConversationById(conversation.id, userId);
  }

  async getConversationById(conversationId: number, userId: number) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['task'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.ensureTaskChatAccess(conversation.task_id, userId);

    const lastMessage = await this.messageRepository.findOne({
      where: { conversation_id: conversationId },
      relations: ['sender'],
      order: { created_at: 'DESC' },
    });

    return {
      id: conversation.id,
      task_id: conversation.task_id,
      created_at: conversation.created_at,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            sender_id: lastMessage.sender_id,
            message: lastMessage.message,
            created_at: lastMessage.created_at,
          }
        : null,
    };
  }

  async getMyConversations(userId: number) {
    const requesterTasks = await this.taskRepository.find({
      where: { requester_id: userId },
    });

    const assignments = await this.assignmentRepository.find({
      where: { performer_id: userId },
    });

    const taskIds = new Set<number>();

    requesterTasks.forEach((task) => taskIds.add(task.id));
    assignments.forEach((assignment) => taskIds.add(assignment.task_id));

    if (taskIds.size === 0) {
      return [];
    }

    const conversations = await this.conversationRepository.find({
      where: [...taskIds].map((taskId) => ({ task_id: taskId })),
      order: { created_at: 'DESC' },
    });

    return Promise.all(
      conversations.map((conversation) =>
        this.getConversationById(conversation.id, userId),
      ),
    );
  }

  async ensureConversationAccess(conversationId: number, userId: number) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.ensureTaskChatAccess(conversation.task_id, userId);

    return conversation;
  }

  private async ensureTaskChatAccess(taskId: number, userId: number) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.requester_id === userId) {
      return true;
    }

    const assignment = await this.assignmentRepository.findOne({
      where: { task_id: taskId, performer_id: userId },
    });

    if (assignment) {
      return true;
    }

    const acceptedApplication = await this.applicationRepository.findOne({
      where: {
        task_id: taskId,
        performer_id: userId,
        status: 'ACCEPTED' as any,
      },
    });

    if (acceptedApplication) {
      return true;
    }

    throw new ForbiddenException('You cannot access this conversation');
  }
}
