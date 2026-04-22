import { IsEnum } from 'class-validator';
import { UserRole } from '../entity/user.entity';

export class SwitchRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}