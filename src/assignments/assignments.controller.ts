import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
} from '@nestjs/common';

import { AssignmentsService } from './assignments.service';
import { AssignmentStatus } from './entities/assignment.entity';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignService: AssignmentsService) {}

  @Get('task/:taskId')
  findByTask(@Param('taskId') taskId: string) {
    return this.assignService.findByTask(Number(taskId));
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: AssignmentStatus },
  ) {
    return this.assignService.updateStatus(Number(id), body.status);
  }
}