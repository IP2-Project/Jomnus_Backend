import { Injectable } from '@nestjs/common';
import { TasksService } from '../tasks/tasks.service';
import { ApplicationsService } from '../applications/applications.service';
import { AssignmentsService } from '../assignments/assignments.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly taskService: TasksService,
    private readonly appService: ApplicationsService,
    private readonly assignmentService: AssignmentsService,
  ) {}

  // ================= DASHBOARD =================
  async getDashboard() {
    return {
      message: 'Dashboard working (no count yet)',
    };
  }

  async getActivityFeed() {
    return [];
  }

  getTasks(query: any) {
    return this.taskService.findAll(query);
  }

  getTaskDetail(id: number) {
    return[
        {
            id: 1,
            task_id: 2,
            worker_id: 6,
            status: 'PENDING',
        },
        {
            id: 2,
            task_id: 3,
            worker_id: 8,
            status: 'ACCEPTED',
         },
    ];
  }

  getApplications(query: any) {
    return this.appService.findAll(query);
  }

  async acceptApplication(id: number, user: any) {
    return this.appService.acceptApplication(id, user);
  }

  async rejectApplication(id: number) {
    return { message: 'Reject not implemented yet' };
  }

  getAssignments(query: any) {
    return [];
  }

  async verifyAssignment(id: number, user: any) {
    return this.assignmentService.verifyAssignment(id, user); 
  }
}