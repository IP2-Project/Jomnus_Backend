import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UserEntity, UserRole } from '@/users/entity/user.entity';
import {
  TaskAssignmentEntity,
  AssignmentStatus,
} from '@/assignments/entities/assignment.entity';
import { TaskApplicationEntity } from '@/applications/entities/task-application.entity';
import { IdentityVerificationEntity } from '@/identity-verifications/entities/identity-verification.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { TaskEntity } from '@/tasks/entities/task.entity';
import { Repository, Like, Not } from 'typeorm';
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

  async getUserGrowth(period: 'Daily' | 'Weekly' | 'Monthly' = 'Daily') {
    const normalizedPeriod = period === 'Monthly' ? 'Monthly' : period === 'Weekly' ? 'Weekly' : 'Daily';
    const unit = normalizedPeriod === 'Daily' ? 'day' : normalizedPeriod === 'Weekly' ? 'week' : 'month';
    const bucketCount = normalizedPeriod === 'Daily' ? 7 : 6;
    const now = new Date();
    const startDate = this.getGrowthStartDate(normalizedPeriod, now);

    const rows = await this.UserRepository.createQueryBuilder('user')
      .select(`date_trunc('${unit}', user.createdAt)`, 'bucket')
      .addSelect('COUNT(*)', 'count')
      .where('user.currentRole != :adminRole', { adminRole: UserRole.ADMIN })
      .andWhere('user.createdAt >= :startDate', { startDate })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany();

    const rowMap = new Map<string, number>();
    for (const row of rows) {
      const key = this.normalizeGrowthBucket(new Date(row.bucket), normalizedPeriod);
      rowMap.set(key, Number(row.count));
    }

    const data = Array.from({ length: bucketCount }, (_, index) => {
      const bucketDate = this.shiftGrowthBucket(startDate, normalizedPeriod, index);
      const key = this.normalizeGrowthBucket(bucketDate, normalizedPeriod);
      return {
        name: this.formatGrowthLabel(bucketDate, normalizedPeriod),
        value: rowMap.get(key) ?? 0,
      };
    });

    const peak = data.reduce<{ name: string; value: number } | null>(
      (best, current) => (!best || current.value > best.value ? current : best),
      null,
    );

    return {
      period: normalizedPeriod,
      total: data.reduce((sum, item) => sum + item.value, 0),
      peak,
      data,
    };
  }

  // ============ TASK MANAGEMENT ============
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

  async findTaskById(id: number, title?: string) {
    const whereCondition: any = { id };
    if (title) {
      whereCondition.title = title;
    }
    return await this.taskRepository.findOne({ where: whereCondition });
  }

  // ============ APPLICATIONS MANAGEMENT ============
  async getAllTaskApplications(id: number) {
    return await this.applicationRepository.find({
      where: { task_id: id },

      relations: [
      "task",
      "performer",
      "task.requester"
     ],
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

  async resetToPending(id: number, reason: string, adminId: number) {
    return await this.identityVerificationsService.resetToPending(id, adminId, reason);
  }

  // ============ CSV EXPORT METHOD ============
  async exportVerificationsToCsv(): Promise<string> {
    return await this.identityVerificationsService.exportToCsv();
  }

// ============ PAGINATION METHODS ============
async paginateUsers(page: number, limit: number, search?: string, role?: string, status?: string) {
  const baseCondition: any = {};

  if (role && role !== 'ALL') {
    baseCondition.currentRole = role;
  } else {
    baseCondition.currentRole = Not('ADMIN');
  }

  if (status && status !== 'ALL') {
    baseCondition.status = status.toLowerCase(); 
  }

  let finalWhereCondition: any;

  if (search && search.trim() !== '') {
    const queryPattern = Like(`%${search.trim()}%`);
    finalWhereCondition = [
      { ...baseCondition, email: queryPattern },
      { ...baseCondition, fullName: queryPattern }
    ];
  } else {
    finalWhereCondition = baseCondition;
  }

  try {
    const [users, total] = await this.UserRepository.findAndCount({
      where: finalWhereCondition,
      withDeleted: true,
      skip: (page - 1) * limit,
      take: limit,
      order: { id: 'DESC' }, 
    });

    const formattedData = users.map(user => {
      const isBanned = user.deletedAt !== null || user.status?.toLowerCase() === 'banned';
      
      const hasVerifiedFlag = user.isIdentityVerified === true;
      return {
        ...user,
        status: isBanned ? 'BANNED' : 'ACTIVE',
        // Now safely populates APPROVED instead of defaulting to NONE
        verificationStatus: user['verificationStatus'] || (hasVerifiedFlag ? 'APPROVED' : 'NONE')
      };
    });

    return {
      data: formattedData,
      total,
      page,
      last_page: Math.ceil(total / limit),
    };
  } catch (dbError) {
    console.error("Database execution failed in paginateUsers:", dbError);
    throw dbError;
  }
}

  async paginateVerificationStatus(page: number, limit: number) {
    return await this.identityVerificationsService.getPaginatedList(page, limit, '', 'ALL');
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
    const [applications, total] = await this.applicationRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,

      relations: {
        task: {
          requester: true
        },
        performer: true
      }
    });
    return {
      data: applications,
      total,
      page,
      last_page: Math.ceil(total / limit),
    };
  }

  private getGrowthStartDate(period: 'Daily' | 'Weekly' | 'Monthly', now: Date) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    if (period === 'Daily') {
      start.setDate(start.getDate() - 6);
      return start;
    }

    if (period === 'Weekly') {
      const day = start.getDay();
      const diffToMonday = (day + 6) % 7;
      start.setDate(start.getDate() - diffToMonday - (5 * 7));
      return start;
    }

    start.setDate(1);
    start.setMonth(start.getMonth() - 5);
    return start;
  }

  private shiftGrowthBucket(startDate: Date, period: 'Daily' | 'Weekly' | 'Monthly', index: number) {
    const date = new Date(startDate);
    if (period === 'Daily') {
      date.setDate(date.getDate() + index);
      return date;
    }

    if (period === 'Weekly') {
      date.setDate(date.getDate() + index * 7);
      return date;
    }

    date.setMonth(date.getMonth() + index);
    return date;
  }

  private normalizeGrowthBucket(date: Date, period: 'Daily' | 'Weekly' | 'Monthly') {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);

    if (period === 'Weekly') {
      const day = normalized.getDay();
      const diffToMonday = (day + 6) % 7;
      normalized.setDate(normalized.getDate() - diffToMonday);
    }

    if (period === 'Monthly') {
      normalized.setDate(1);
    }

    return normalized.toISOString();
  }

  private formatGrowthLabel(date: Date, period: 'Daily' | 'Weekly' | 'Monthly') {
    if (period === 'Daily') {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }

    if (period === 'Weekly') {
      return `Wk ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }

    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
}
