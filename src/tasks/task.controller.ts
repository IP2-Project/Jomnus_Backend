import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';

import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() dto: CreateTaskDto) {
    const userId = 1;
    return this.tasksService.create(dto, userId);
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
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(Number(id));
  }
}