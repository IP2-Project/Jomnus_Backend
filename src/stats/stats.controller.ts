import { Controller, Get, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('performer/:userId')
  async getPerformerStats(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.statsService.getPerformerStats(userId);
  }

  @Get('requester/:userId')
  async getRequesterStats(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.statsService.getRequesterStats(userId);
  }
}