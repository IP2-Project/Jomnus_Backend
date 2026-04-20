import { IsNumber } from 'class-validator';

export class CreateApplicationDto {
  @IsNumber()
  taskId: number;
}