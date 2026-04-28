import { 
  Controller, Get, Patch, Post, Param, Body, ParseIntPipe, 
  Request, UseGuards, ForbiddenException, Logger, Query,
  UseInterceptors, UploadedFiles 
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { IdentityVerificationsService } from './identity-verifications.service';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';

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
      },
    ),
  )
  async create(
    @Request() req,
    @UploadedFiles() files: { id_card?: Express.Multer.File[]; selfie?: Express.Multer.File[] },
  ) {
    const userId = req.user?.id || req.user?.sub;

    // Map the uploaded file paths to the DTO your service expects
    const dto = {
      id_card_url: files.id_card?.[0]?.path || '',
      selfie_url: files.selfie?.[0]?.path || '',
    };

    return this.service.create(userId, dto);
  }

  // --- ADMIN ROUTES ---

  @UseGuards(JwtAuthGuard)
  @Get('dashboard-stats')
  async getStats(@Request() req) {
    this.checkAdmin(req);
    return this.service.getAdminStats();
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

  // Helper to keep code clean
  private checkAdmin(req: any) {
    const userRole = req.user?.currentRole || req.user?.role || req.user?.current_role;
    if (userRole !== 'ADMIN') {
      throw new ForbiddenException(`Access denied. Admin privileges required.`);
    }
  }
}