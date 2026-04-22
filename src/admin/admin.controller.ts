import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import type { Request } from 'express';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard';


@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ================= DASHBOARD =================
  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('dashboard/activity')
  getActivity() {
    return this.adminService.getActivityFeed();
  }

  // ================= TASKS =================
  @Get('tasks')
  getTasks(@Query() query: any) {
    return this.adminService.getTasks(query);
  }

  @Get('tasks/:id')
  getTaskDetail(@Param('id') id: string) { 
    return this.adminService.getTaskDetail(Number(id));
  }

  // ================= APPLICATIONS =================
  @Get('applications')
  getApplications(@Query() query: any) {
    return this.adminService.getApplications(query);
  }

  @Post('applications/:id/accept')
  acceptApplication(@Param('id') id: string, @Req() req: Request) {
    console.log('USER >>>', (req as any).user);

    return this.adminService.acceptApplication(
        Number(id),
        (req as any).user
      );
  }

  @Post('applications/:id/reject')
  rejectApplication(@Param('id') id: string) {
    return this.adminService.rejectApplication(Number(id));
  }

  // ================= ASSIGNMENTS =================
  @Get('assignments')
  getAssignments(@Query() query: any) {
    return this.adminService.getAssignments(query);
  }

  @Post('assignments/:id/verify')
  verifyAssignment(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user ?? { id: 1 };

    return this.adminService.verifyAssignment(Number(id), user);
  }
}