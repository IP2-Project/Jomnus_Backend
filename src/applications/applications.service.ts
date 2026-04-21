import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TaskApplicationEntity, ApplicationStatus } from './entities/task-application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { TasksService } from '@/tasks/tasks.service';
import { TaskStatus } from '@/tasks/entities/task.entity';
import { AssignmentsService } from '@/assignments/assignments.service';
import { UsersService } from '@/users/users.service';

@Injectable()
export class ApplicationsService {
    constructor(
        @InjectRepository(TaskApplicationEntity)
        private appRepo: Repository<TaskApplicationEntity>,
        private tasksService: TasksService,
        private assignmentsService: AssignmentsService,
        private userService: UsersService
    ) {}

    async create(dto: CreateApplicationDto, userId: number) {
        const existing = await this.appRepo.findOne({
            where: {
                task_id: dto.taskId,
                performer_id: userId,
            },
        });

        if (existing) {
            throw new Error('You already applied');
        }

        const task = await this.tasksService.findOne(dto.taskId);

        if (!task) throw new Error('Task not found');

        if (task.requester_id === userId) {
        throw new Error('Cannot apply to your own task');
        }

        const app = this.appRepo.create({
            task_id: dto.taskId,
            performer_id: userId,
        });

        return this.appRepo.save(app);
    }

    findByTask(taskId: number) {
        return this.appRepo.find({
        where: { task_id: taskId },
        });
    }

    updateStatus(id: number, status: ApplicationStatus) {
        return this.appRepo.update(id, { status });
    }

    remove(id: number) {
        return this.appRepo.delete(id);
    }

    async acceptApplication(applicationId: number) {
        const application = await this.appRepo.findOne({
            where: { id: applicationId },
        });

        if (!application) throw new Error('Application not found');
        
        // PREVENT ACCEPTING ALREADY ACCEPTED
        if (application.status === ApplicationStatus.ACCEPTED) {
            throw new Error('Application already accepted');
        }

        // PREVENT ACCEPTING REJECTED
        if (application.status === ApplicationStatus.REJECTED) {
            throw new Error('Cannot accept rejected application');
        }

        const taskId = application.task_id;

        const task = await this.tasksService.findOne(taskId);

        if (!task) throw new Error('Task not found');

        if (task.status !== TaskStatus.POSTED) {
        throw new Error('Task is no longer accepting applications');
        }

        const acceptedCount = await this.appRepo.count({
            where: {
            task_id: taskId,
            status: ApplicationStatus.ACCEPTED,
            },
        });

        if (acceptedCount >= task.required_workers) {
            throw new Error('Task already has enough workers');
        }

        const existingAssignments = await this.assignmentsService.findByTask(taskId);

        const alreadyAssigned = existingAssignments.find(
            (a) => a.performer_id === application.performer_id,
        );

        if (alreadyAssigned) {
            throw new Error('User already assigned');
        }

        await this.appRepo.update(applicationId, {
            status: ApplicationStatus.ACCEPTED,
        });

        await this.assignmentsService.create(
            taskId,
            application.performer_id,
        );

        const newAcceptedCount = acceptedCount + 1;
        const requester = await this.userService.findById(task.requester_id);

        if (newAcceptedCount >= task.required_workers) {
            await this.appRepo
            .createQueryBuilder()
            .update()
            .set({ status: ApplicationStatus.REJECTED })
            .where('task_id = :taskId', { taskId })
            .andWhere('status = :status', { status: ApplicationStatus.PENDING })
            .execute();

            await this.tasksService.update(
                taskId, 
                {
                status: TaskStatus.IN_PROGRESS,
                },
                requester!,
            );
        }

        return { message: 'Application accepted' };
    }

}