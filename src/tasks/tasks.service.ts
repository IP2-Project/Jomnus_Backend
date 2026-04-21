import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TaskEntity } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskCategory } from '@/categories/entities/task-category.entity';
import { CategoriesService } from '@/categories/categories.service';
import { UserEntity, UserRole } from '@/users/entity/user.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private taskRepo: Repository<TaskEntity>,

    @InjectRepository(TaskCategory)
    private taskCategoryRepo: Repository<TaskCategory>,

    private categoriesService: CategoriesService,    
  ) {}

  async create(dto: CreateTaskDto, userId: number) {
    const task = await this.taskRepo.save({
      title: dto.title,
      description: dto.description,
      requester_id: userId,
      price: dto.price,
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

  async findAll() {
    const tasks = await this.taskRepo.find({
      order: { created_at: 'DESC' },
    });

    return Promise.all(
      tasks.map(task => this.findOne(task.id))
    );
  }

  async findOne(id: number) {
    const task = await this.taskRepo.findOne({
      where: { id },
    });


    if (!task) {
      throw new NotFoundException('Task not found');
    }
    const taskCategories = await this.taskCategoryRepo.find({
      where: { task_id: id },
    });

    const categoryIds = taskCategories.map(tc => tc.category_id);

    const categories = categoryIds.length
      ? await this.categoriesService.findByIds(categoryIds)
      : [];

    return {
      ...task,
      categories,
    };
  }

  findByUser(userId: number) {
    return this.taskRepo.find({
      where: { requester_id: userId },
    });
  }

  async update(id: number, dto: UpdateTaskDto, user: UserEntity) {

    const task = await this.taskRepo.findOne({ where: { id } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (user.currentRole !== UserRole.ADMIN && task.requester_id !== user.id) {
      throw new ForbiddenException();
    }

    await this.taskRepo.update(id, {
      ...dto,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      location_text: dto.locationText,
      required_workers: dto.requiredWorkers,
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
}