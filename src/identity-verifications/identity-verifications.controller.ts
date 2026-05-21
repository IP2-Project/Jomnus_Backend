import { 
  Controller, Get, Patch, Post, Param, Body, ParseIntPipe, 
  Request, UseGuards, ForbiddenException, Logger, Query,
  UseInterceptors, UploadedFiles, BadRequestException, Response,
  ClassSerializerInterceptor 
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { IdentityVerificationsService } from './identity-verifications.service';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { memoryStorage } from 'multer';
import type { Response as ExpressResponse } from 'express';

@Controller('identity-verifications')
@UseInterceptors(ClassSerializerInterceptor)
export class IdentityVerificationsController {
  private readonly logger = new Logger(IdentityVerificationsController.name);

  constructor(private readonly service: IdentityVerificationsService) {}

  // --- ADMIN STATS ---
  @UseGuards(JwtAuthGuard)
  @Get('admin/stats')
  async getStats(@Request() req) {
    this.checkAdmin(req);
    return this.service.getAdminStats();
  }

  // --- DATA EXPORT ---
  @UseGuards(JwtAuthGuard)
  @Get('export')
  async export(@Request() req, @Response({ passthrough: true }) res: ExpressResponse) {
    this.checkAdmin(req);
    const csv = await this.service.exportToCsv();
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="identity-verifications.csv"',
    });
    return csv;
  }

  // --- LIST & SEARCH ---
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    this.checkAdmin(req);
    return this.service.getPaginatedList(page, limit, search, status); 
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.checkAdmin(req);
    return this.service.getOne(id);
  }

  // --- USER SUBMISSION ---
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'id_card', maxCount: 1 },
        { name: 'selfie', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, callback) => {
          if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
            return callback(new BadRequestException('Only JPG and PNG images are allowed!'), false);
          }
          callback(null, true);
        },
      },
    ),
  )
  async create(
    @Request() req,
    @UploadedFiles() files: { id_card?: Express.Multer.File[]; selfie?: Express.Multer.File[] },
  ) {
    const userId = this.getUserId(req);
    if (!files?.id_card?.[0] || !files?.selfie?.[0]) {
      throw new BadRequestException('Both an ID Card image and a Selfie image are required.');
    }

    return this.service.create(userId, {
      id_card_file: files.id_card[0],
      selfie_file: files.selfie[0],
    });
  }

  // --- REVIEW FLOW ---
  @UseGuards(JwtAuthGuard)
  @Patch(':id/review')
  async review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewVerificationDto,
    @Request() req,
  ) {
    this.checkAdmin(req);
    const adminId = this.getUserId(req);
    return this.service.review(id, adminId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reset')
  async reset(
    @Param('id', ParseIntPipe) id: number, 
    @Body() body: { reason?: string }, 
    @Request() req
  ) {
    this.checkAdmin(req);
    const adminId = this.getUserId(req);
    const reasonText = body?.reason?.trim() || "Admin initiated reset to pending";
    return this.service.resetToPending(id, adminId, reasonText);
  }
  
  @UseGuards(JwtAuthGuard)
  @Patch(':id/clear-images')
  async clearImages(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.checkAdmin(req);
    const adminId = this.getUserId(req);
    return this.service.clearVerificationImages(id, adminId);
  }

  // --- HELPERS ---
  private checkAdmin(req: any) {
    const userRole = req.user?.currentRole || req.user?.role || req.user?.current_role;
    if (userRole !== 'ADMIN') {
      throw new ForbiddenException(`Access denied. Admin privileges required.`);
    }
  }

  private getUserId(req: any): number {
    return req.user?.id || req.user?.sub;
  }
}