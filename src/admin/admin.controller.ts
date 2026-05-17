import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  Patch,
  ParseIntPipe,
  BadRequestException,
  Body,
  Header,
  Req, // 👈 Added Req import
} from '@nestjs/common';
import { adminServices } from './admin.service';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { UserRole } from '@/users/entity/user.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class adminController {
  constructor(private readonly adminServices: adminServices) {}

  // ============ USER MANAGEMENT ============
  @Get('users')
  async getAllUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
      throw new BadRequestException('Invalid page or limit parameters');
    }
    
    return await this.adminServices.paginateUsers(pageNum, limitNum);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    return await this.adminServices.deleteUser(id);
  }

  // ============ TASK MANAGEMENT ============
  @Get('tasks')
  async getAllTasks() {
    return await this.adminServices.getAllTasks();
  }

  @Delete('tasks/:id')
  async deleteTask(@Param('id', ParseIntPipe) id: number) {
    return await this.adminServices.deleteTask(id);
  }

  @Get('tasks/:id')
  async getTaskById(@Param('id', ParseIntPipe) id: number) {
    return await this.adminServices.findTaskById(id, '');
  }

  // ============ APPLICATIONS MANAGEMENT ============
  @Get('applications')
  async getAllApplications(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
      throw new BadRequestException('Invalid page or limit parameters');
    }
    
    return await this.adminServices.paginateApplications(pageNum, limitNum);
  }

  @Get('tasks/:taskId/applications')
  async getTaskApplications(@Param('taskId', ParseIntPipe) taskId: number) {
    return await this.adminServices.getAllTaskApplications(taskId);
  }

  // ============ ASSIGNMENTS MANAGEMENT ============
  @Get('assignments')
  async getAllAssignments(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
      throw new BadRequestException('Invalid page or limit parameters');
    }
    
    return await this.adminServices.paginateAssignments(pageNum, limitNum);
  }

  @Get('tasks/:taskId/completions')
  async getTaskCompletions(@Param('taskId', ParseIntPipe) taskId: number) {
    return await this.adminServices.getAllTaskCompletions(taskId);
  }

  // ============ VERIFICATIONS MANAGEMENT ============
  
  @Get('verifications/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=\"verifications-export.csv\"')
  async exportVerifications() {
    return await this.adminServices.exportVerificationsToCsv();
  }

  @Get('verifications')
  async getAllVerifications(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
      throw new BadRequestException('Invalid page or limit parameters');
    }
    
    return await this.adminServices.paginateVerificationStatus(pageNum, limitNum);
  }

  @Patch('verifications/:id/approve')
  async approveVerification(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any // 👈 Captures user authentication context
  ) {
    const adminId = req.user?.id || 1; // Fallback to 1 if testing without custom guard extraction setup
    return await this.adminServices.verifyIdentity(id, adminId);
  }

  @Patch('verifications/:id/reject')
  async rejectVerification(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @Req() req: any
  ) {
    const adminId = req.user?.id || 1;
    return await this.adminServices.rejectIdentity(id, reason, adminId);
  }

  @Patch('verifications/:id/reset')
  async resetVerificationToPending(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any // 👈 Passed down request payload context
  ) {
    const adminId = req.user?.id || 1; 
    return await this.adminServices.resetToPending(id, adminId); // 👈 Added adminId payload parameter
  }

  // ============ DASHBOARD STATS ============
  @Get('dashboard/stats')
  async getDashboardStats() {
    const users = await this.adminServices.getAllUser();
    const tasks = await this.adminServices.getAllTasks();
    const assignments = await this.adminServices.getAllAssignmentTasks();
    const verifications = await this.adminServices.paginateVerificationStatus(1, 1000);

    return {
      totalUsers: users.length,
      totalTasks: tasks.length,
      totalAssignments: assignments.length,
      totalVerifications: verifications.meta.totalItems,
      completedAssignments: assignments.filter(
        (a: any) => a.status === 'COMPLETED',
      ).length,
      activeAssignments: assignments.filter(
        (a: any) => a.status === 'IN_PROGRESS',
      ).length,
      pendingVerifications: verifications.data.filter(
        (v: any) => v.status === 'PENDING',
      ).length,
      approvedVerifications: verifications.data.filter(
        (v: any) => v.status === 'APPROVED',
      ).length,
    };
  }
}