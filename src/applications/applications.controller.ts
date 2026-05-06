import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApplicationsService } from './applications.service';
import { ApplicationStatus } from './entities/task-application.entity';
import type { RequestWithUser } from '@/common/interfaces/request-with-user.interface';
import { CreateApplicationDto } from './dto/create-application.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
    constructor(private readonly appService: ApplicationsService) {}

    @Post()
    create(@Body() dto: CreateApplicationDto, @Req() req: RequestWithUser) {
        return this.appService.create(
            dto,
            req.user.id
        );
    }

    @Get('task/:taskId')
    findByTask(
        @Param('taskId') taskId: string,
        @Req() req: RequestWithUser,
    ) {
        return this.appService.findByTask(
            Number(taskId),
            req.user,
        );
    }

    @Get('me')
    findMine(@Req() req: RequestWithUser) {
    return this.appService.findMine(req.user.id);
    }

    @Patch(':id/reject')
    reject(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    ) {
    return this.appService.rejectApplication(Number(id), req.user);
    }

    @Patch(':id/cancel')
    cancel(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    ) {
    return this.appService.cancelApplication(Number(id), req.user);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.appService.remove(Number(id));
    }

    @Patch(':id/accept')
    accept(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    ) {
    return this.appService.acceptApplication(Number(id), req.user);
    }
}