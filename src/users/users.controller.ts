import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SwitchRoleDto } from './dto/switch-role.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard'; 
import { GetUser } from '@/common/decorators/get-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard) // Protect all endpoints in this module
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@GetUser('id') userId: string) {
    return this.usersService.findOne(userId);
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('me')
  updateMe(
    @GetUser('id') userId: string, 
    @Body() updateDto: UpdateProfileDto
  ) {
    return this.usersService.updateMe(userId, updateDto);
  }

  @Patch('role')
  switchRole(
    @GetUser('id') userId: string, 
    @Body() switchRoleDto: SwitchRoleDto
  ) {
    return this.usersService.switchRole(userId, switchRoleDto.role);
  }
}