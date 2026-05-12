import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../entity/user.entity';

export class ChangeRoleDto {
  @IsEnum(UserRole, {
    message: 'Role must be REQUESTER, PERFORMER, or ADMIN',
  })
  @IsNotEmpty()
  role!: UserRole;
}