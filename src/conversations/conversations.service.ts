import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationsEntity } from './entity/conversations.entity';
import { MessageEntity } from '@/messages/entity/messages.entity';
import { TaskEntity } from '@/tasks/entities/task.entity';
import { TaskAssignmentEntity } from '@/assignments/entities/assignment.entity';
import { TaskApplicationEntity } from '@/applications/entities/task-application.entity';
import { UserEntity } from '@/users/entity/user.entity';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(ConversationsEntity)
    private readonly conversationRepository: Repository<ConversationsEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(TaskAssignmentEntity)
    private readonly assignmentRepository: Repository<TaskAssignmentEntity>,
    @InjectRepository(TaskApplicationEntity)
    private readonly applicationRepository: Repository<TaskApplicationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  // =========================
  // 🔒 SAFE NUMBER GUARD
  // =========================
  private toValidId(value: any, name: string): number {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0 || Number.isNaN(id)) {
      throw new BadRequestException(`Invalid ${name}`);
    }

    return id;
  }

  async createConversation(taskId: number, userId: number) {
    taskId = this.toValidId(taskId, 'taskId');
    userId = this.toValidId(userId, 'userId');

    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) throw new NotFoundException('Task not found');

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
    conversationId = this.toValidId(conversationId, 'conversationId');
    userId = this.toValidId(userId, 'userId');

    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['task', 'task.requester'],
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

    const participant = await this.resolveParticipant(
      conversation.task,
      userId,
    );

    return {
      id: conversation.id,
      task_id: conversation.task_id,
      task_title: conversation.task?.title ?? '',
      created_at: conversation.created_at,
      participantId: participant?.id ?? null,
      participantName: participant?.fullName ?? 'Unknown User',
      participantAvatar: participant?.profileImage ?? '',
      lastMessage: lastMessage?.message ?? '',
      lastMessageAt: lastMessage?.created_at ?? conversation.created_at,
      unreadCount: 0,
    };
  }

  async getMyConversations(userId: number) {
    userId = this.toValidId(userId, 'userId');

    const requesterTasks = await this.taskRepository.find({
      where: { requester_id: userId },
    });

    const assignments = await this.assignmentRepository.find({
      where: { performer_id: userId },
    });

    const taskIds = new Set<number>();

    requesterTasks.forEach((t) => taskIds.add(t.id));
    assignments.forEach((a) => taskIds.add(a.task_id));

    if (taskIds.size === 0) return [];

    const conversations = await this.conversationRepository.find({
      where: [...taskIds].map((taskId) => ({ task_id: taskId })),
      relations: ['task', 'task.requester'],
      order: { created_at: 'DESC' },
    });

    return Promise.all(
      conversations.map((c) => this.getConversationById(c.id, userId)),
    );
  }

  async ensureConversationAccess(conversationId: number, userId: number) {
    conversationId = this.toValidId(conversationId, 'conversationId');
    userId = this.toValidId(userId, 'userId');

    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.ensureTaskChatAccess(conversation.task_id, userId);

    return conversation;
  }

  private async resolveParticipant(task: TaskEntity, currentUserId: number) {
    if (task.requester_id === currentUserId) {
      const assignment = await this.assignmentRepository.findOne({
        where: { task_id: task.id },
      });

      if (assignment) {
        return this.userRepository.findOne({
          where: { id: assignment.performer_id },
        });
      }

      const acceptedApp = await this.applicationRepository.findOne({
        where: { task_id: task.id, status: 'ACCEPTED' as any },
      });

      if (acceptedApp) {
        return this.userRepository.findOne({
          where: { id: acceptedApp.performer_id },
        });
      }

      return null;
    }

    return task.requester ?? null;
  }

  private async ensureTaskChatAccess(taskId: number, userId: number) {
    taskId = this.toValidId(taskId, 'taskId');
    userId = this.toValidId(userId, 'userId');

    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) throw new NotFoundException('Task not found');

    const isRequester = task.requester_id === userId;

    const assignment = await this.assignmentRepository.findOne({
      where: { task_id: taskId, performer_id: userId },
    });

    const acceptedApplication = await this.applicationRepository.findOne({
      where: {
        task_id: taskId,
        performer_id: userId,
        status: 'ACCEPTED' as any,
      },
    });

    if (isRequester || assignment || acceptedApplication) {
      return true;
    }

    throw new ForbiddenException('You cannot access this conversation');
  }
}
