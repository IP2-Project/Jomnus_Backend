import { ApiProperty } from '@nestjs/swagger/dist/decorators/api-property.decorator';
import {
  IsEmail,
  IsString,
  Length,
  MinLength,
  IsNotEmpty,
} from 'class-validator';

export class ResetPasswordDTO {
  @ApiProperty({ example: 'user@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  otp!: string;

  @ApiProperty({ example: 'New password must be at least 8 characters long' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password!: string;
}
