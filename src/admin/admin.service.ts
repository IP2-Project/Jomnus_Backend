import { Injectable } from '@nestjs/common';
import { UserEntity } from '@/users/entity/user.entity';
import {
  TaskAssignmentEntity,
  AssignmentStatus,
} from '@/assignments/entities/assignment.entity';
import { TaskApplicationEntity } from '@/applications/entities/task-application.entity';
import {
  IdentityVerificationEntity,
  VerificationStatus,
} from '@/identity-verifications/entities/identity-verification.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { TaskEntity } from '@/tasks/entities/task.entity';
import { Repository } from 'typeorm';

@Injectable()
export class adminServices {
  constructor(
    @InjectRepository(UserEntity)
    private readonly UserRepository: Repository<UserEntity>,
    @InjectRepository(TaskAssignmentEntity)
    private readonly assignmentRepository: Repository<TaskAssignmentEntity>,
    @InjectRepository(TaskApplicationEntity)
    private readonly applicationRepository: Repository<TaskApplicationEntity>,
    @InjectRepository(IdentityVerificationEntity)
    private readonly verificationStatusRepository: Repository<IdentityVerificationEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
  ) {}

  async deleteUser(id: number) {
    return await this.UserRepository.delete(id);
  }
  async getAllUser() {
    return await this.UserRepository.find();
  }

  async getAllTasks() {
    const tasks = await this.taskRepository.find({
      relations: ['requester'],
      order: { created_at: 'DESC' },
    });

    return tasks.map((task) => ({
      ...task,
      requester: task.requester
          ? {
            id: task.requester.id,
            fullName: task.requester.fullName,
            email: task.requester.email,
            profileImage: task.requester.profileImage,
          }
          : null,
    }));
  }

  async deleteTask(id: number) {
    return await this.taskRepository.delete(id);
  }

  async findTaskById(id: number, title: string) {
    return await this.taskRepository.findOne({ where: { id, title } });
  }

  async getAllTaskApplications(id: number) {
    return await this.applicationRepository.find({
      where: { task_id: id },
    });
  }

  async getAllTaskCompletions(id: number) {
    return await this.assignmentRepository.find({
      where: { status: AssignmentStatus.COMPLETED, task_id: id },
    });
  }

  async getAllAssignmentTasks() {
    return await this.assignmentRepository.find();
  }

  async findAssingmentActive(id: number) {
    return await this.assignmentRepository.find({
      where: { status: AssignmentStatus.IN_PROGRESS, task_id: id },
    });
  }

  async verifyIdentity(id: number) {
    const verification = await this.verificationStatusRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (verification) {
      verification.status = VerificationStatus.APPROVED;
      await this.verificationStatusRepository.save(verification);
      const user = verification.user;
      user.isIdentityVerified = true;
      await this.UserRepository.save(user);
    }
  }

  async paginateUsers(page: number, limit: number) {
    const [users, total] = await this.UserRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: users,
      total,
      page,
      last_page: Math.ceil(total / limit),
    };
  }

  async paginateVerificationStatus(page: number, limit: number) {
    const [verifications, total] =
      await this.verificationStatusRepository.findAndCount({
        skip: (page - 1) * limit,
        take: limit,
      });
    return {
      data: verifications,
      total,
      page,
      last_page: Math.ceil(total / limit),
    };
  }

  async paginateAssignments(page: number, limit: number) {
    const [assignments, total] = await this.assignmentRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      relations: ['task', 'performer'],
    });

    return {
      data: assignments.map((a) => ({
        ...a,
        task: a.task ? { id: a.task.id, title: a.task.title } : null,
        performer: a.performer ? {
          id: a.performer.id,
          fullName: a.performer.fullName,
          email: a.performer.email,
        } : null,
      })),
      total,
      page,
      last_page: Math.ceil(total / limit),
    };
  }

  async paginateApplications(page: number, limit: number) {
    const [applications, total] = await this.applicationRepository.findAndCount(
      {
        skip: (page - 1) * limit,
        take: limit,
      },
    );
    return {
      data: applications,
      total,
      page,
      last_page: Math.ceil(total / limit),
    };
  }
}
