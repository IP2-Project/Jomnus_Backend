import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TaskAssignmentEntity, AssignmentStatus } from './entities/assignment.entity';
import { UserEntity } from '@/users/entity/user.entity';
import { TaskEntity, TaskStatus } from '@/tasks/entities/task.entity';

@Injectable()
export class AssignmentsService {
    constructor(
        @InjectRepository(TaskAssignmentEntity)
        private assignRepo: Repository<TaskAssignmentEntity>,
        @InjectRepository(TaskEntity)
        private taskRepo: Repository<TaskEntity>
    ) {}

    create(taskId: number, performerId: number,  applicationId: number, price: number) {
        const assignment = this.assignRepo.create({
        task_id: taskId,
        performer_id: performerId,
        application_id: applicationId,
        accepted_price: price,  
        status: AssignmentStatus.ASSIGNED,
        });

        return this.assignRepo.save(assignment);
    }

    findByTask(taskId: number) {
        return this.assignRepo.find({
        where: { task_id: taskId },
        relations: ['performer', 'application'],
        });
    }

    async startAssignment(id: number, user: UserEntity) {
        const assignment = await this.assignRepo.findOne({
            where: { id },
        });

        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }

        if (assignment.performer_id !== user.id) {
            throw new ForbiddenException();
        }

        if (assignment.status !== AssignmentStatus.ASSIGNED) {
            throw new BadRequestException('Assignment has already started');
        }

        await this.assignRepo.update(id, {
            status: AssignmentStatus.IN_PROGRESS,
        });

        return { message: 'Marked as in progress' };
    }


  async findByUser(userId: number) {
    const assignments = await this.assignRepo.find({
      where: { performer_id: userId },
      relations: ['task', 'task.requester'],
      order: { created_at: 'DESC' },
    });

    return assignments.map((a) => ({
      assignmentId: a.id,
      status: a.status,
      acceptedPrice: a.accepted_price,

      task: a.task
        ? {
          id: a.task.id,
          title: a.task.title,
          description: a.task.description,
          price: a.task.price,
          deadline: a.task.deadline,
          locationText: a.task.location_text,
        }
        : null,

      requester: a.task?.requester
        ? {
          id: a.task.requester.id,
          fullName: a.task.requester.fullName,
          profileImage: a.task.requester.profileImage,
        }
        : null,
    }));
  }

    async completeAssignment(id: number, user: UserEntity) {
        const assignment = await this.assignRepo.findOne({
            where: { id },
        });

        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }

        if (assignment.performer_id !== user.id) {
            throw new ForbiddenException();
        }

        if (assignment.status !== AssignmentStatus.IN_PROGRESS) {
            throw new BadRequestException('Invalid state');
        }

        await this.assignRepo.update(id, {
            status: AssignmentStatus.COMPLETED,
        });

        return { message: 'Marked as completed' };
    }

    async verifyAssignment(id: number, user: UserEntity) {
        const assignment = await this.assignRepo.findOne({
            where: { id },
        });

        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }

        const task = await this.taskRepo.findOne({
            where: { id: assignment.task_id },
        });

        if (!task) throw new NotFoundException('Task not found');

        // 🔐 Only requester
        if (task.requester_id !== user.id) {
            throw new ForbiddenException();
        }

        if (assignment.status !== AssignmentStatus.COMPLETED) {
            throw new BadRequestException('Not completed yet');
        }

        await this.assignRepo.update(id, {
            status: AssignmentStatus.VERIFIED,
            is_verified: true,
            verified_at: new Date(),
        });

        return { message: 'Verified successfully' };
    }


    async cancelAssignment(id: number, user: UserEntity) {
        const assignment = await this.assignRepo.findOne({
            where: { id },
        });

        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }

        if (assignment.performer_id !== user.id) {
            throw new ForbiddenException();
        }

        if (assignment.status !== AssignmentStatus.IN_PROGRESS) {
            throw new BadRequestException('Cannot cancel now');
        }

        await this.assignRepo.update(id, {
            status: AssignmentStatus.CANCELLED,
            cancelled_by: user.id,
            cancelled_at: new Date(),
        });

        return { message: 'Cancelled' };
    }

}
