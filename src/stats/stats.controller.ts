import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard';

@Controller('stats')
// @UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('performer/:userId')
  async getPerformerStats(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.statsService.getPerformerStats(userId.toString());
  }

  @Get('requester/:userId')
  async getRequesterStats(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.statsService.getRequesterStats(userId.toString());
  }
}