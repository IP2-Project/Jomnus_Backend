import { Body, Controller, Get, Inject, Param, ParseIntPipe, Post, Req } from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { CreateTaskDto } from "./dto/create-task.dto";

@Controller("task")
export class TasksController{
    constructor(private readonly tasksService: TasksService){}

    @Post()
    createTask(@Req() req, @Body() data:CreateTaskDto, ){
        return this.tasksService.createTask(req.user.Id, data);
    }

    @Get()
    getTasks(){
        return this.tasksService.getTasks();
    }

    @Get(":id")
    getTaskById(@Param('id', ParseIntPipe) id: number){
        return this.tasksService.getTaskById(id);
    }
}