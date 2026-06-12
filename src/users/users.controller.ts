import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Delete, 
  Param, 
  Query, 
  UseGuards, 
  Request, 
  ForbiddenException, 
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  UploadedFile
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRole } from './entity/user.entity';
import { VerificationStatus } from '@/identity-verifications/entities/identity-verification.entity'; // Add this import
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard';
import { RegisterAuthDto } from '@/auth/dto/register-auth.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { SwitchRoleDto, UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor) 
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
    @Patch('me')
    async updateMe(
      @Request() req, 
      @Body() updateUserDto: any
    ) {
      const userId = this.getAdminId(req);
      return this.usersService.updateMe(userId, updateUserDto);
    }

  
  @UseGuards(JwtAuthGuard)
    @Post('upload-avatar')
    @UseInterceptors(FileInterceptor('file'))
    async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    }


  @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Request() req) {
      const userId = this.getAdminId(req);
      return this.usersService.findById(userId);
    }

  @UseGuards(JwtAuthGuard)
    @Patch('me/switch-role')
    async switchRole(
      @Request() req,
      @Body() switchRoleDto: SwitchRoleDto
    ) {
      const userId = req.user.id;

      return this.usersService.switchUserRole(
        userId,
        switchRoleDto,
      );
    }
  
    @Get(':id')
    async findById(@Param('id', ParseIntPipe) id: number) {
      return this.usersService.findById(id);
    }


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
  @Get('admin/pending-verifications')
  async getPending(@Query('page') page: number, @Request() req) {
    this.checkAdmin(req);
    return this.usersService.getPendingVerifications(page || 1);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/review-verification/:id')
  async reviewVerification(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: VerificationStatus,
    @Body('reason') reason: string,
    @Request() req
  ) {
    this.checkAdmin(req);
    const adminId = this.getAdminId(req);
    return this.usersService.reviewVerification(id, status, adminId, reason);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/audit-logs')
  async getLogs(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.checkAdmin(req);
    return this.usersService.getUserAuditLogs(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/manual-verify')
  async manualVerify(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.checkAdmin(req);
    const adminId = this.getAdminId(req);
    return this.usersService.manualVerify(id, adminId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/role')
  async changeRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() changeRoleDto: ChangeRoleDto,
    @Request() req,
  ) {
    this.checkAdmin(req);
    const adminId = this.getAdminId(req);
    return this.usersService.changeRole(id, changeRoleDto.role, adminId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/verified-badge')
  async toggleVerifiedBadge(
    @Param('id', ParseIntPipe) id: number,
    @Body('isVerified') isVerified: boolean,
    @Request() req,
  ) {
    this.checkAdmin(req);
    const adminId = this.getAdminId(req);
    return this.usersService.toggleVerifiedBadge(id, isVerified, adminId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  async toggleStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
    @Request() req,
  ) {
    this.checkAdmin(req);
    const adminId = this.getAdminId(req);
    return this.usersService.toggleStatus(id, updateUserStatusDto.status, adminId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/restore')
  async restoreUser(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.checkAdmin(req); 
    const adminId = this.getAdminId(req); 
    return this.usersService.restoreUser(id, adminId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async BanUser(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.checkAdmin(req);
    const adminId = this.getAdminId(req);
    return this.usersService.BanUser(id, adminId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile/:id')
  async getUserProfile(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/:id')
  async findUserAdmin(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.checkAdmin(req);
    return this.usersService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query() query: any, @Request() req) {
    this.checkAdmin(req); // Keep it secure
    return this.usersService.getPaginatedUsers(query);
  }

  @Post()
  create(@Body() registerDto: RegisterAuthDto) {
    return this.usersService.create(registerDto);
  }

  private checkAdmin(req: any) {
    if (!req.user) throw new ForbiddenException('User session not found.');
    const userRole = req.user?.currentRole || req.user?.role;
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied. Admin privileges required.');
    }
  }

  private getAdminId(req: any): number {
    return req.user?.id || req.user?.sub;
  }
}