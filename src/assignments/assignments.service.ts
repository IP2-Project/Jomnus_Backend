import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Assignment, AssignmentStatus } from './entities/assignment.entity';

@Injectable()
export class AssignmentsService {
    constructor(
        @InjectRepository(Assignment)
        private assignRepo: Repository<Assignment>,
    ) {}

    create(taskId: number, performerId: number) {
        const assignment = this.assignRepo.create({
        task_id: taskId,
        performer_id: performerId,
        });

        return this.assignRepo.save(assignment);
    }

    findByTask(taskId: number) {
        return this.assignRepo.find({
        where: { task_id: taskId },
        });
    }

    updateStatus(id: number, status: AssignmentStatus) {
        return this.assignRepo.update(id, { status });
    }
}