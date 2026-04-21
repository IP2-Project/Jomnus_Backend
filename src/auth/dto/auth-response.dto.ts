import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entity/user.entity';

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  user!: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
}
