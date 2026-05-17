import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UserEntity } from '@/users/entity/user.entity';
import {
  TaskAssignmentEntity,
  AssignmentStatus,
} from '@/assignments/entities/assignment.entity';
import { TaskApplicationEntity } from '@/applications/entities/task-application.entity';
import { IdentityVerificationEntity } from '@/identity-verifications/entities/identity-verification.entity';
import { AuditLogEntity } from '@/identity-verifications/entities/audit-log.entity'; 
import { InjectRepository } from '@nestjs/typeorm';
import { TaskEntity } from '@/tasks/entities/task.entity';
import { Repository } from 'typeorm';
import { IdentityVerificationsService } from '@/identity-verifications/identity-verifications.service';

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
    
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
    
    @Inject(forwardRef(() => IdentityVerificationsService))
    private readonly identityVerificationsService: IdentityVerificationsService,
  ) {}

  // ============ USER MANAGEMENT ============
  async deleteUser(id: number) {
    return await this.UserRepository.delete(id);
  }
  
  async getAllUser() {
    return await this.UserRepository.find();
  }

  // ============ TASK MANAGEMENT ============
  async getAllTasks() {
    return await this.taskRepository.find();
  }

  async deleteTask(id: number) {
    return await this.taskRepository.delete(id);
  }

  async findTaskById(id: number, title: string) {
    return await this.taskRepository.findOne({ where: { id, title } });
  }

  // ============ APPLICATIONS MANAGEMENT ============
  async getAllTaskApplications(id: number) {
    return await this.applicationRepository.find({
      where: { task_id: id },
    });
  }

  // ============ ASSIGNMENTS MANAGEMENT ============
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

  // ============ IDENTITY VERIFICATION METHODS ============

  async verifyIdentity(id: number, adminId: number) {
    // Delegates to the main service to reuse transactional state handling, notifications, and strict document checks
    return await this.identityVerificationsService.review(id, adminId, {
      status: 'APPROVED' as any,
    });
  }

  async rejectIdentity(id: number, reason: string, adminId: number) {
    return await this.identityVerificationsService.review(id, adminId, {
      status: 'REJECTED' as any,
      rejection_reason: reason || 'No reason provided',
    });
  }

  async resetToPending(id: number, adminId: number) {
    return await this.identityVerificationsService.resetToPending(id, adminId);
  }

  // ============ CSV EXPORT METHOD ============
  async exportVerificationsToCsv(): Promise<string> {
    // Uses structural parsing routines with lowercase v.user.fullName tracking checks
    return await this.identityVerificationsService.exportToCsv();
  }

  // ============ PAGINATION METHODS ============

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
    // Pulls from getPaginatedList to properly build URLs with process.env.APP_URL formatting
    return await this.identityVerificationsService.getPaginatedList(page, limit, '', 'ALL');
  }

  async paginateAssignments(page: number, limit: number) {
    const [assignments, total] = await this.assignmentRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: assignments,
      total,
      page,
      last_page: Math.ceil(total / limit),
    };
  }

  async paginateApplications(page: number, limit: number) {
    const [applications, total] = await this.applicationRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: applications,
      total,
      page,
      last_page: Math.ceil(total / limit),
    };
  }
}