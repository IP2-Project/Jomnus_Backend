import { IsString, IsOptional, IsEnum, IsUrl } from 'class-validator';
import { UserRole } from '../entity/user.entity';

export class UpdateProfileDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsUrl() profileImage?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
}

export class SwitchRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}