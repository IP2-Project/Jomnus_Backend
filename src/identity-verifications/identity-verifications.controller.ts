import { Controller, Get, Patch, Param, Body, ParseIntPipe, Request, UseGuards, ForbiddenException, Logger } from '@nestjs/common';
import { IdentityVerificationsService } from './identity-verifications.service';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';

@Controller('identity-verifications')
export class IdentityVerificationsController {
  private readonly logger = new Logger(IdentityVerificationsController.name);

  constructor(private readonly service: IdentityVerificationsService) {}

  // --- ADDED: Get all pending verifications ---
  @UseGuards(JwtAuthGuard)
  @Get('pending')
  async findAllPending(@Request() req) {
    const userRole = req.user?.currentRole || req.user?.role || req.user?.current_role;

    if (userRole !== 'ADMIN') {
      throw new ForbiddenException(`Access denied. Admin privileges required.`);
    }

    return this.service.getPendingList();
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/review')
  async review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewVerificationDto,
    @Request() req,
  ) {
    this.logger.log(`Request user object: ${JSON.stringify(req.user)}`);

    const userRole = req.user?.currentRole || req.user?.role || req.user?.current_role;

    if (userRole !== 'ADMIN') {
      throw new ForbiddenException(
        `Access denied. Your current role is: ${userRole || 'NOT_FOUND'}. Admin privileges required.`
      );
    }

    const adminId = req.user?.id || req.user?.sub;

    return this.service.review(id, adminId, dto);
  }
}