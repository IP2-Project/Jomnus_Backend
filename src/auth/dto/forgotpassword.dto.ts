import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
export class ForgotPasswordDTO {
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  email!: string;
}
