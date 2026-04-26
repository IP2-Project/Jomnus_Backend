import { Controller, Patch, Param, Body, ParseIntPipe, Request, UseGuards, ForbiddenException, Logger } from '@nestjs/common';
import { IdentityVerificationsService } from './identity-verifications.service';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';

@Controller('identity-verifications')
export class IdentityVerificationsController {
  private readonly logger = new Logger(IdentityVerificationsController.name);

  constructor(private readonly service: IdentityVerificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Patch(':id/review')
  async review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewVerificationDto,
    @Request() req,
  ) {
    // 1. Log the user object to help you debug in the Docker console
    this.logger.log(`Request user object: ${JSON.stringify(req.user)}`);

    // 2. Extract the role checking ALL possible names including 'currentRole'
    // This ensures it works with your original Entity without changing the Strategy
    const userRole = req.user?.currentRole || req.user?.role || req.user?.current_role;

    // 3. Security Check
    if (userRole !== 'ADMIN') {
      throw new ForbiddenException(
        `Access denied. Your current role is: ${userRole || 'NOT_FOUND'}. Admin privileges required.`
      );
    }

    // 4. Extract Admin ID (checking both 'id' and JWT 'sub')
    const adminId = req.user?.id || req.user?.sub;

    return this.service.review(id, adminId, dto);
  }
}