import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterAuthDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  email!: string;

  @ApiProperty({ example: 'Username' })
  @IsNotEmpty()
  @IsString()
  username!: string;

  @ApiProperty({ example: 'Password must be at least 6 characters long' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Password must be at least 6 characters long' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  confirmPassword!: string;

  @ApiProperty({
    example: 'none',
    enum: ['response', 'request', 'none'],
    required: false,
  })
  @IsOptional()
  @IsString()
  helper?: 'response' | 'request' | 'none';
}
