import { 
  Controller, Get, Patch, Post, Param, Body, ParseIntPipe, 
  Request, UseGuards, ForbiddenException, Logger, Query,
  UseInterceptors, UploadedFiles, BadRequestException, Response
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { IdentityVerificationsService } from './identity-verifications.service';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response as ExpressResponse } from 'express';

@Controller('identity-verifications')
export class IdentityVerificationsController {
  private readonly logger = new Logger(IdentityVerificationsController.name);

  constructor(private readonly service: IdentityVerificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'id_card', maxCount: 1 },
        { name: 'selfie', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: './uploads/identity-verifications',
          filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            callback(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
          },
        }),
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB Limit
        },
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
    const userId = req.user?.id || req.user?.sub;

    if (!files?.id_card?.[0] || !files?.selfie?.[0]) {
      throw new BadRequestException('Both an ID Card image and a Selfie image are required.');
    }

    const dto = {
      id_card_url: files.id_card[0].path.replace(/\\/g, '/'),
      selfie_url: files.selfie[0].path.replace(/\\/g, '/'),
    };

    this.logger.log(`User ${userId} submitted verification documents.`);
    return this.service.create(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard-stats')
  async getStats(@Request() req) {
    this.checkAdmin(req);
    return this.service.getAdminStats();
  }

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

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    this.checkAdmin(req);
    return this.service.getPaginatedList(page, limit, search);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/review')
  async review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewVerificationDto,
    @Request() req,
  ) {
    this.checkAdmin(req);
    const adminId = req.user?.id || req.user?.sub;
    return this.service.review(id, adminId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reset')
  async reset(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.checkAdmin(req);
    const adminId = req.user?.id || req.user?.sub;
    return this.service.resetToPending(id, adminId);
  }

  private checkAdmin(req: any) {
    const userRole = req.user?.currentRole || req.user?.role || req.user?.current_role;
    if (userRole !== 'ADMIN') {
      throw new ForbiddenException(`Access denied. Admin privileges required.`);
    }
  }
}