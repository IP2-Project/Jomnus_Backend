import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  taskId!: number;
}
