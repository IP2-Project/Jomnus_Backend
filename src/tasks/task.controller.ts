import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';

import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import type { RequestWithUser } from '@/common/interfaces/request-with-user.interface';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() dto: CreateTaskDto, @Req() req: RequestWithUser) {
    return this.tasksService.create(dto, req.user.id);
  }

  @Get()
  findAll() {
    return this.tasksService.findAll();
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
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Req() req: RequestWithUser) {
    return this.tasksService.update(Number(id), dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(Number(id));
  }
}