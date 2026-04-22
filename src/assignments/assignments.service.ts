import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TaskAssignmentEntity, AssignmentStatus } from './entities/assignment.entity';
import { UserEntity } from '@/users/entity/user.entity';
import { TaskEntity } from '@/tasks/entities/task.entity';

@Injectable()
export class AssignmentsService {
    findAll(query: any) {
        throw new Error('Method not implemented.');
    }
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
        });

        return this.assignRepo.save(assignment);
    }

    findByTask(taskId: number) {
        return this.assignRepo.find({
        where: { task_id: taskId },
        });
    }


    findByUser(userId: number) {
        return this.assignRepo.find({
            where: { performer_id: userId },
        });
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