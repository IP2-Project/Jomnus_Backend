import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TaskApplicationEntity, ApplicationStatus } from './entities/task-application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { TasksService } from '@/tasks/tasks.service';
import { TaskStatus } from '@/tasks/entities/task.entity';
import { AssignmentsService } from '@/assignments/assignments.service';
import { UsersService } from '@/users/users.service';
import { UserEntity } from '@/users/entity/user.entity';
import { NotificationsService } from '@/notifications/notifications.service';
import { ConversationsService } from '@/conversations/conversations.service';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(TaskApplicationEntity)
    private appRepo: Repository<TaskApplicationEntity>,
    private tasksService: TasksService,
    private assignmentsService: AssignmentsService,
    private userService: UsersService,
    private notificationsService: NotificationsService,
    private conversationsService: ConversationsService, // ← must be here
  ) {}

  async create(dto: CreateApplicationDto, userId: number) {
    const task = await this.tasksService.findOne(dto.taskId);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status !== TaskStatus.POSTED) {
      throw new BadRequestException('Task is no longer accepting applications');
    }

    const acceptedCount = await this.appRepo.count({
      where: {
        task_id: task.id,
        status: ApplicationStatus.ACCEPTED,
      },
    });

    if (acceptedCount >= task.required_workers) {
      throw new BadRequestException('Task already has enough workers');
    }

    if (task.requester_id === userId) {
      throw new BadRequestException('Cannot apply to your own task');
    }

    const existing = await this.appRepo.findOne({
      where: {
        task_id: dto.taskId,
        performer_id: userId,
      },
    });

    if (existing) {
      throw new BadRequestException('You already applied');
    }

    const app = this.appRepo.create({
      task_id: dto.taskId,
      performer_id: userId,
      offered_price: dto.offeredPrice,
    });

    const saved = await this.appRepo.save(app);

    const applicationWithPerformer = await this.appRepo.findOne({
      where: { id: saved.id },
      relations: ['performer'],
    });

    if (applicationWithPerformer && applicationWithPerformer.performer) {
      await this.notificationsService.notifyNewApplicant(
        task.requester_id,
        applicationWithPerformer.performer.fullName,
        task.title,
        task.id,
      );
    }
    return applicationWithPerformer;
  }

  async findMine(userId: number) {
    return this.appRepo.find({
      where: {
        performer_id: userId,
      },

      relations: ['task', 'task.requester'],

      order: {
        applied_at: 'DESC',
      },
    });
  }

  async findByTask(taskId: number, user: UserEntity) {
    const task = await this.tasksService.findOne(taskId);

    if (!task) {
      throw new NotFoundException();
    }

    if (task.requester_id !== user.id) {
      throw new ForbiddenException();
    }
    return this.appRepo.find({
      where: { task_id: taskId },
      relations: ['performer'],
      order: {
        applied_at: 'DESC',
      },
    });
  }

  async rejectApplication(applicationId: number, user: UserEntity) {
    const application = await this.appRepo.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const task = await this.tasksService.findOne(application.task_id);
    if (!task) throw new NotFoundException('Task not found');

    if (task.requester_id !== user.id) {
      throw new ForbiddenException();
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Cannot reject this application');
    }

    await this.appRepo.update(applicationId, {
      status: ApplicationStatus.REJECTED,
    });

    return { message: 'Application rejected' };
  }

  remove(id: number) {
    return this.appRepo.delete(id);
  }

  async cancelApplication(applicationId: number, user: UserEntity) {
    const application = await this.appRepo.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.performer_id !== user.id) {
      throw new ForbiddenException();
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Cannot cancel this application');
    }

    await this.appRepo.update(applicationId, {
      status: ApplicationStatus.CANCELLED,
    });

    return { message: 'Application cancelled' };
  }

  async acceptApplication(applicationId: number, user: UserEntity) {
    const application = await this.appRepo.findOne({
      where: { id: applicationId },
      relations: ['performer'],
    });

    if (!application) throw new NotFoundException('Application not found');

    const task = await this.tasksService.findOne(application.task_id);
    if (!task) throw new NotFoundException('Task not found');

    if (task.requester_id !== user.id) {
      throw new ForbiddenException('Only task owner can accept');
    }

    if (application.status === ApplicationStatus.ACCEPTED) {
      throw new BadRequestException('Already accepted');
    }

    if (application.status === ApplicationStatus.REJECTED) {
      throw new BadRequestException('Already rejected');
    }

    if (task.status !== TaskStatus.POSTED) {
      throw new BadRequestException('Task not accepting applications');
    }

    const acceptedCount = await this.appRepo.count({
      where: {
        task_id: task.id,
        status: ApplicationStatus.ACCEPTED,
      },
    });

    if (acceptedCount >= task.required_workers) {
      throw new BadRequestException('Enough workers already');
    }

    await this.appRepo.update(applicationId, {
      status: ApplicationStatus.ACCEPTED,
    });

    await this.assignmentsService.create(
      task.id,
      application.performer_id,
      application.id,
      application.offered_price,
    );

    // await this.conversationsService.createConversation(task.id, user.id);

    await this.notificationsService.notifyApplicationAccepted(
      application.performer_id,
      task.title,
      task.id,
    );

    return { message: 'Application accepted' };
  }

  async rejectPendingByTask(taskId: number, user: UserEntity) {
    const task = await this.tasksService.findOne(taskId);

    if (!task) throw new NotFoundException('Task not found');

    if (task.requester_id !== user.id) {
      throw new ForbiddenException();
    }

    const acceptedCount = await this.appRepo.count({
      where: {
        task_id: taskId,
        status: ApplicationStatus.ACCEPTED,
      },
    });

    if (acceptedCount < task.required_workers) {
      throw new BadRequestException(
        'Accept all required workers before closing applications',
      );
    }

    await this.appRepo
      .createQueryBuilder()
      .update()
      .set({ status: ApplicationStatus.REJECTED })
      .where('task_id = :taskId', { taskId })
      .andWhere('status = :status', { status: ApplicationStatus.PENDING })
      .execute();

    return { message: 'Remaining applications rejected' };
  }
}
