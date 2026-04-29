// @/users/users.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Delete, // Added
  Param, 
  Query, 
  UseGuards, 
  Request, 
  ForbiddenException, 
  ParseIntPipe 
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRole } from './entity/user.entity';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard';
import { RegisterAuthDto } from '@/auth/dto/register-auth.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('admin/dashboard')
  async getDashboard(@Query() query: any, @Request() req) {
    this.checkAdmin(req);
    return this.usersService.getPaginatedUsers(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/stats')
  async getStats(@Request() req) {
    this.checkAdmin(req);
    return this.usersService.getAdminSummaryStats();
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/verify-manually')
  async manualVerify(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.checkAdmin(req);
    return this.usersService.manualVerify(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/role')
  async changeRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: UserRole,
    @Request() req,
  ) {
    this.checkAdmin(req);
    const adminId = req.user?.id || req.user?.sub;
    return this.usersService.changeRole(id, role, adminId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  async toggleStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
    @Request() req,
  ) {
    this.checkAdmin(req);
    const adminId = req.user?.id || req.user?.sub;
    return this.usersService.toggleStatus(id, status, adminId);
  }

  // LOGIC 1: Delete User Route
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async softDelete(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.checkAdmin(req);
    const adminId = req.user?.id || req.user?.sub;
    return this.usersService.softRemove(id, adminId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.checkAdmin(req);
    return this.usersService.findById(id);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() registerDto: RegisterAuthDto) {
    return this.usersService.create(registerDto);
  }

  private checkAdmin(req: any) {
    if (!req.user) throw new ForbiddenException('User session not found.');
    const userRole = req.user?.currentRole || req.user?.role;
    if (userRole !== 'ADMIN') {
      throw new ForbiddenException('Access denied. Admin privileges required.');
    }
  }
}