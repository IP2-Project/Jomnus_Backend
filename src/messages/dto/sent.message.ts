import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  conversationId!: number;

  @ApiProperty({ example: 'Hello, how are you?' })
  @IsNotEmpty()
  @IsString()
  message!: string;
}
