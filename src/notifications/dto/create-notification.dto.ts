export class CreateNotificationDto {
  user_id!: number;
  task_id?: number;
  title!: string;
  message!: string;
}