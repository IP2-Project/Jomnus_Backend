import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterAuthDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  email!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  fullName!: string;

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
}
