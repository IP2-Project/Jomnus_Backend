import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';

import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationStatus } from './entities/task-application.entity';

@Controller('applications')
export class ApplicationsController {
    constructor(private readonly appService: ApplicationsService) {}

    @Post()
    create(@Body() body: { taskId: number; userId: number }) {
        return this.appService.create(
            { taskId: body.taskId },
            body.userId,
        );
    }

    @Get('task/:taskId')
    findByTask(@Param('taskId') taskId: string) {
        return this.appService.findByTask(Number(taskId));
    }

    @Patch(':id')
    updateStatus(@Param('id') id: string, @Body() body: { status: ApplicationStatus }) {
        return this.appService.updateStatus(Number(id), body.status);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.appService.remove(Number(id));
    }

    @Patch(':id/accept')
    accept(@Param('id') id: string) {
    return this.appService.acceptApplication(Number(id));
    }

}