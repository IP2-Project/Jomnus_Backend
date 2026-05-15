import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { TaskEntity, TaskStatus } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskCategory } from '@/categories/entities/task-category.entity';
import { CategoriesService } from '@/categories/categories.service';
import { UserEntity, UserRole } from '@/users/entity/user.entity';
import {
  ApplicationStatus,
  TaskApplicationEntity,
} from '@/applications/entities/task-application.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private taskRepo: Repository<TaskEntity>,

    @InjectRepository(TaskCategory)
    private taskCategoryRepo: Repository<TaskCategory>,

    @InjectRepository(TaskApplicationEntity)
    private taskApplicationRepo: Repository<TaskApplicationEntity>,

    private categoriesService: CategoriesService,
  ) {}

  private mapTaskWithRequester(task: TaskEntity, categories?: unknown) {
    const { requester, ...taskData } = task;

    return {
      ...taskData,
      requester: requester
        ? {
            fullName: requester.fullName,
            profile_image: requester.profileImage,
          }
        : undefined,
      ...(categories ? { categories } : {}),
    };
  }

  async create(dto: CreateTaskDto, userId: number) {
    this.validateTaskDates(dto.startDate, dto.deadline);

    const task = await this.taskRepo.save({
      title: dto.title,
      description: dto.description,
      requester_id: userId,
      price: dto.price,
      start_date: dto.startDate ? new Date(dto.startDate) : undefined,
      deadline: new Date(dto.deadline),
      required_workers: dto.requiredWorkers ?? 1,
      location_text: dto.locationText,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });

    if (dto.categoryIds?.length) {
      const taskCategories = dto.categoryIds.map((categoryId) => ({
        task_id: task.id,
        category_id: categoryId,
      }));

      await this.taskCategoryRepo.save(taskCategories);
    }

    return task;
  }

  async findAll(userId: number) {
    const tasks = await this.taskRepo.find({
      where: {
        status: TaskStatus.OPEN ,
      },
      relations: ['requester'],
      order: { created_at: 'DESC' },
    });

    if (!tasks.length) {
      return [];
    }

    const taskIds = tasks.map((task) => task.id);
    const applications = await this.taskApplicationRepo.find({
      where: { task_id: In(taskIds) },
      select: ['task_id', 'performer_id', 'status'],
    });

    const acceptedCountByTask = applications.reduce<Record<number, number>>(
      (counts, application) => {
        if (application.status === ApplicationStatus.ACCEPTED) {
          counts[application.task_id] = (counts[application.task_id] ?? 0) + 1;
        }

        return counts;
      },
      {},
    );

    const appliedTaskIds = new Set(
      applications
        .filter((application) => application.performer_id === userId)
        .map((application) => application.task_id),
    );

    return tasks
      .filter(
        (task) =>
          (acceptedCountByTask[task.id] ?? 0) < task.required_workers,
      )
      .map((task) => ({
        ...this.mapTaskWithRequester(task),
        acceptedWorkers: acceptedCountByTask[task.id] ?? 0,
        hasApplied: appliedTaskIds.has(task.id),
      }));
  }


  async findOne(id: number) {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: ['requester'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }
    const taskCategories = await this.taskCategoryRepo.find({
      where: { task_id: id },
    });

    const categoryIds = taskCategories.map((tc) => tc.category_id);

    const categories = categoryIds.length
      ? await this.categoriesService.findByIds(categoryIds)
      : [];

    return this.mapTaskWithRequester(task, categories);
  }

  async findByUser(userId: number) {
    const tasks = await this.taskRepo.find({
      where: { requester_id: userId },
      relations: ['requester'],
    });

    return tasks.map((task) => this.mapTaskWithRequester(task));
  }

  async update(id: number, dto: UpdateTaskDto, user: UserEntity) {
    const task = await this.taskRepo.findOne({ where: { id } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (user.currentRole !== UserRole.ADMIN && task.requester_id !== user.id) {
      throw new ForbiddenException();
    }

    this.validateTaskDates(
      dto.startDate,
      dto.deadline,
      task.start_date,
      task.deadline,
    );

    await this.taskRepo.update(id, {
      title: dto.title,
      description: dto.description,
      price: dto.price,
      status: dto.status,
      start_date: dto.startDate ? new Date(dto.startDate) : undefined,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      location_text: dto.locationText,
      required_workers: dto.requiredWorkers,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });

    return this.findOne(id);
  }

  async remove(id: number) {
    const task = await this.taskRepo.findOne({ where: { id } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.taskRepo.remove(task);
  }

  private validateTaskDates(
    startDate?: string,
    deadline?: string,
    existingStartDate?: Date,
    existingDeadline?: Date,
  ) {
    const now = new Date();
    const start = startDate
      ? new Date(startDate)
      : existingStartDate
        ? new Date(existingStartDate)
        : undefined;
    const end = deadline
      ? new Date(deadline)
      : existingDeadline
        ? new Date(existingDeadline)
        : undefined;

    if (startDate && start && start.getTime() < now.getTime()) {
      throw new BadRequestException('Start time cannot be in the past');
    }

    if (deadline && end && end.getTime() <= now.getTime()) {
      throw new BadRequestException('Deadline must be in the future');
    }

    if (start && end && end.getTime() <= start.getTime()) {
      throw new BadRequestException('Deadline must be after the start time');
    }
  }
}
