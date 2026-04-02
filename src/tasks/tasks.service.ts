import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Task } from "./entities/task.entity";
import { Repository } from "typeorm";
import { CreateTaskDto } from "./dto/create-task.dto";

@Injectable()
export class TasksService {
  constructor(@InjectRepository(Task) private readonly tasksRepository:Repository<Task>){}

  async createTask(userId: number, dto: CreateTaskDto){
    const task = this.tasksRepository.create({
      requester_id: userId,
      ...dto
    })
    return await this.tasksRepository.save(task);
  }

  async getTasks(){
    return await this.tasksRepository.find({
      order: {created_at: 'DESC'}
    })
  }

  async getTaskById(taskId: number){
    const task = await this.tasksRepository.findOne({
      where: {id: taskId}
    })
    
    if(!task){
      throw new NotFoundException("Task not found");
    }

    return task;
  }

  

}