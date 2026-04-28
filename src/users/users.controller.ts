import { Controller, Get, Post, Patch, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { RegisterAuthDto } from '@/auth/dto/register-auth.dto';
import { UserRole } from './entity/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // LOGIC 2: Orange Alert Box Stats
  @Get('admin/stats')
  async getAdminStats() {
    return this.usersService.getAdminSummaryStats();
  }

  // LOGIC 1: Main Dashboard Table
  @Get('admin/dashboard')
  async getDashboardUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('role') role?: string,
    @Query('verified') verified?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.getPaginatedUsers({
      page,
      limit,
      role,
      verified,
      status,
      search,
    });
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Post()
  create(@Body() registerDto: RegisterAuthDto) {
    return this.usersService.create(registerDto);
  }

  // LOGIC 3: Change Role (Arrows Icon)
  @Patch(':id/role')
  async changeUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: UserRole,
  ) {
    return this.usersService.changeRole(id, role);
  }

  // LOGIC 3: Ban/Unban (Circle Slash Icon)
  @Patch(':id/status')
  async toggleStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    return this.usersService.toggleStatus(id, status);
  }
}