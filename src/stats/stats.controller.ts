import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
  HttpException, // Add this
} from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('performer/:userId')
  async getPerformerStats(@Param('userId', ParseIntPipe) userId: number) {
    try {
      return await this.statsService.getPerformerStats(userId.toString());
    } catch (error: any) { // Case error to 'any' or check type
      if (error instanceof HttpException && error.getStatus() === 404) {
        // We renamed this to createInitialStats in the service merge
        // We need to fetch the user or modify the service to accept ID
        // For now, let's assume the service handles the logic we combined
        return await this.statsService.getPerformerStats(userId.toString());
      }
      throw error;
    }
  }

  @Get('requester/:userId')
  async getRequesterStats(@Param('userId', ParseIntPipe) userId: number) {
    try {
      return await this.statsService.getRequesterStats(userId.toString());
    } catch (error: any) {
      if (error instanceof HttpException && error.getStatus() === 404) {
        // Ensure this matches the new method name in your stats.service.ts
        return await this.statsService.getRequesterStats(userId.toString());
      }
      throw error;
    }
  }
}