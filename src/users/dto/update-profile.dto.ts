import { IsString, IsOptional, IsEnum, IsUrl } from 'class-validator';
import { UserRole } from '../entity/user.entity';

export class UpdateProfileDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;

  // IMPORTANT: only URL
  @IsOptional() @IsString()
  profileImage?: string;
}

export class SwitchRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}