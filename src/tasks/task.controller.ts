import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';

import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import type { RequestWithUser } from '@/common/interfaces/request-with-user.interface';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard';
import { Query } from '@nestjs/common';

//@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() dto: CreateTaskDto, @Req() req: RequestWithUser) {
    const userID = req.user?.id ?? 1; 
    return this.tasksService.create(dto, userID);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.tasksService.findAll(query);
  }

  @Get('user/:id')
  findByUser(@Param('id') id: string) {
    return this.tasksService.findByUser(Number(id));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(Number(id));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const fakeUser = {
      id: 1,
      currentRole: 'ADMIN',
    } as any;

  return this.tasksService.update(Number(id), dto, fakeUser);
}

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(Number(id));
  }
}