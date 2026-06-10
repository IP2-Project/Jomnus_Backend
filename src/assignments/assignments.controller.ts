import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AssignmentsService } from './assignments.service';
import { AssignmentStatus } from './entities/assignment.entity';
import type { RequestWithUser } from '@/common/interfaces/request-with-user.interface';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignService: AssignmentsService) {}

  @Get('task/:taskId')
  findByTask(@Param('taskId') taskId: string) {
    return this.assignService.findByTask(Number(taskId));
  }

  @Patch(':id/complete')
  complete(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.assignService.completeAssignment(Number(id), req.user);
  }

  @Patch(':id/start')
  start(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.assignService.startAssignment(Number(id), req.user);
  }

  @Patch(':id/verify')
  verify(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.assignService.verifyAssignment(Number(id), req.user);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.assignService.cancelAssignment(Number(id), req.user);
  }  

  @Get('my')
  getMy(@Req() req: RequestWithUser) {
    return this.assignService.findByUser(req.user.id);
  }  

  @Get('work-history')
  async getWorkHistory(@Req() req: RequestWithUser) {
    return this.assignService.getCompletedWorkHistory(req.user.id);
  }

  @Get('work-history/:userId')
  async getWorkHistoryByUser(@Param('userId') userId: string) {
    return this.assignService.getCompletedWorkHistory(Number(userId));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assignService.findOne(Number(id));
  }
 
}
