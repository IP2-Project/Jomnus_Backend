import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { UserService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SwitchRoleDto } from './dto/switch-role.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard'; 
import { GetUser } from '@/common/decorators/get-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard) // Protect all endpoints in this module
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  getMe(@GetUser('id') userId: string) {
    return this.userService.findOne(userId);
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch('me')
  updateMe(
    @GetUser('id') userId: string, 
    @Body() updateDto: UpdateProfileDto
  ) {
    return this.userService.updateMe(userId, updateDto);
  }

  @Patch('role')
  switchRole(
    @GetUser('id') userId: string, 
    @Body() switchRoleDto: SwitchRoleDto
  ) {
    return this.userService.switchRole(userId, switchRoleDto.role);
  }
}