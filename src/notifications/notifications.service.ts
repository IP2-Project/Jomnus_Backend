import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  // --- GENERIC METHOD (Prevents Merge Conflicts) ---
  async createNotification(data: Partial<Notification>) {
    const notification = this.notificationRepo.create(data);
    return await this.notificationRepo.save(notification);
  }

  private async sendToUser(userId: number, title: string, message: string, taskId?: number) {
    const notification = this.notificationRepo.create({
      user_id: userId,
      audience: 'user',
      title,
      message,
      task_id: taskId ?? null,
    });
    return this.notificationRepo.save(notification);
  }

  async notifyApplicationAccepted(performerId: number, taskTitle: string, taskId: number) {
    return this.sendToUser(performerId, 'Application Accepted ', `Congratulations! You have been chosen to complete: ${taskTitle}.`, taskId);
  }

  async notifySubmissionApproved(performerId: number, taskTitle: string, taskId: number) {
    return this.sendToUser(performerId, 'Submission Approved ', `Success! Your proof for "${taskTitle}" was accepted. Funds have been added.`, taskId);
  }

  async notifyNewApplicant(receiverId: number, applicantName: string, taskTitle: string, taskId: number) {
    return this.sendToUser(receiverId, 'New Applicant ', `You have a new application! ${applicantName} wants to do your task: ${taskTitle}.`, taskId);
  }

  async notifyProofSubmitted(receiverId: number, taskTitle: string, taskId: number) {
    return this.sendToUser(receiverId, 'Proof Ready for Review ', `A performer has submitted proof for "${taskTitle}". Please review it.`, taskId);
  }

  async getUserNotifications(userId: number) {
    const notifications = await this.notificationRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });

    const unreadCount = await this.notificationRepo.count({
      where: { user_id: userId, is_read: false },
    });

    return {
      unread_count: unreadCount,
      data: notifications,
    };
  }

  private async sendToAdmins(title: string, message: string, taskId?: number) {
    const notification = this.notificationRepo.create({
      user_id: null,
      audience: 'admin',
      title,
      message,
      task_id: taskId ?? null,
    });
    return this.notificationRepo.save(notification);
  }

  async notifyAdminNewIdVerification(userId: number) {
    return this.sendToAdmins('New Identity Verification ', `User #${userId} has submitted their ID for verification. Review required.`);
  }

  async notifyAdminReportedTask(taskId: number, reason: string) {
    return this.sendToAdmins('Task Flagged ', `Task #${taskId} has been reported for: ${reason}. Please investigate.`, taskId);
  }

  async getAdminNotifications() {
    const notifications = await this.notificationRepo.find({
      where: { audience: 'admin' }, 
      order: { created_at: 'DESC' },
    });

    const unreadCount = await this.notificationRepo.count({
      where: { audience: 'admin', is_read: false },
    });

    return {
      unread_count: unreadCount,
      data: notifications,
    };
  }

  async markAsRead(id: number, userId: number) {
    const notification = await this.notificationRepo.findOne({
      where: { id, user_id: userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.is_read = true;
    return await this.notificationRepo.save(notification);
  }

  async markAllAsRead(userId: number) {
    await this.notificationRepo.update(
      { user_id: userId, is_read: false },
      { is_read: true },
    );
    return { message: 'All notifications marked as read' };
  }
}