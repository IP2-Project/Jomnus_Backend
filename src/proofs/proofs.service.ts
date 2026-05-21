
import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProofDto } from './dto/create-proof.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proof, ProofStatus } from './entities/task-proof.entity';
import { AssignmentStatus, TaskAssignmentEntity } from '@/assignments/entities/assignment.entity';
import { TaskEntity, TaskStatus } from '@/tasks/entities/task.entity';
import { UserEntity } from '@/users/entity/user.entity';
import { NotificationsService } from '@/notifications/notifications.service';
// import { Review } from '@/reviews/entities/review.entity';

@Injectable()
export class ProofsService {
  constructor(
    @InjectRepository(Proof)
    private readonly proofRepository: Repository<Proof>,
    @InjectRepository(TaskAssignmentEntity)
    private readonly assignmentRepository: Repository<TaskAssignmentEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    private readonly notificationsService: NotificationsService
  ) {}

  async submitProof(createProofDto: CreateProofDto): Promise<Proof> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: createProofDto.assignment_id },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.status !== AssignmentStatus.IN_PROGRESS) {
      throw new BadRequestException('Proof can only be submitted after work has started');
    }

    const proof = this.proofRepository.create(createProofDto);
    const saved = await this.proofRepository.save(proof);

    await this.assignmentRepository.update(assignment.id, {
      status: AssignmentStatus.COMPLETED,
    });

    const task = await this.taskRepository.findOne({ where: { id: assignment.task_id } });
    if (task) {
        await this.notificationsService.notifyProofSubmitted(
            task.requester_id, 
            task.title, 
            task.id
        );
    }

    return saved;
  }

  async getProofsByAssignmentId(assignmentId: number): Promise<Proof[]> {
    return this.proofRepository.find({
      where: { assignment_id: assignmentId },
    });
  }

  async updateProofStatus(id: number, status: ProofStatus, user: UserEntity): Promise<Proof> {
    const proof = await this.proofRepository.findOne({
      where: { id },
      relations: ['assignment'],
    });
    if (!proof) {
      throw new HttpException('Proof not found', HttpStatus.NOT_FOUND);
    }

    const assignment = await this.assignmentRepository.findOne({
      where: { id: proof.assignment_id },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const task = await this.taskRepository.findOne({
      where: { id: assignment.task_id },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.requester_id !== user.id) {
      throw new ForbiddenException();
    }

    proof.status = status;
    const saved = await this.proofRepository.save(proof);

    if (status === ProofStatus.APPROVED) {
      await this.assignmentRepository.update(assignment.id, {
        status: AssignmentStatus.VERIFIED,
        is_verified: true,
        verified_at: new Date(),
      });

      await this.notificationsService.notifySubmissionApproved(
          assignment.performer_id, 
          task.title, 
          task.id
      );  

      const taskAssignments = await this.assignmentRepository.find({
        where: { task_id: task.id },
      });
      const allVerified = taskAssignments.length > 0 &&
        taskAssignments.every((item) =>
          item.id === assignment.id
            ? true
            : item.status === AssignmentStatus.VERIFIED,
        );

      if (allVerified) {
        await this.taskRepository.update(task.id, {
          status: TaskStatus.COMPLETED,
        });
      }
    }

    if (status === ProofStatus.REJECTED) {
      await this.assignmentRepository.update(assignment.id, {
        status: AssignmentStatus.IN_PROGRESS,
      });
    }

    return saved;
  }

  async getAllProofs(): Promise<Proof[]> {
    return this.proofRepository.find({
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findByAssignment(assignmentId: number) {
      return this.proofRepository.find({
          where: {
              assignment_id: assignmentId,
          },

          order: {
              created_at: 'DESC',
          },
      });
  }

}
