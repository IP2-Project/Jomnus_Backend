import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserStatus } from '../entity/user.entity';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus, {
    message: 'Status must be either active or banned',
  })
  @IsNotEmpty()
  status!: UserStatus;
}