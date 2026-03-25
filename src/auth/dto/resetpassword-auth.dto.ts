import { IsEmail, IsString, Length, MinLength } from 'class-validator';
export class ResetPasswordDTO {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 characters long' })
  otp: string;

  @IsString()
  @MinLength(8, {
    message: 'Password is too short. Minimum length is 8 characters',
  })
  password: string;
}
