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
  async getPerformerStats(@Param('userId', ParseIntPipe) userId: number) {
    try {
      // Try to get existing stats
      return await this.statsService.getPerformerStats(userId.toString());
    } catch (error) {
      // If service threw 404, create the defaults on the fly
      if (error.status === 404) {
        const newStats = await this.statsService.createDefaultStats(userId);
        return newStats.performer;
      }
      throw error; // Re-throw if it's a different error (like DB connection)
    }
  }

@Get('requester/:userId')
  async getRequesterStats(@Param('userId', ParseIntPipe) userId: number) {
    try {
      return await this.statsService.getRequesterStats(userId.toString());
    } catch (error) {
      if (error.status === 404) {
        const newStats = await this.statsService.createDefaultStats(userId);
        return newStats.requester;
      }
      throw error;
    }
  }
}