import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
<<<<<<< HEAD
  HttpException,
  NotFoundException,
  Post,
=======
  HttpException, // Add this
>>>>>>> abe8346 (fix: resolve TS unknown error and naming mismatch in stats controller)
} from '@nestjs/common';
import { StatsService } from './stats.service';
import { UsersService } from '@/users/users.service'; // Add this import
import { JwtAuthGuard } from '@/auth/guards/jwt.auth.guard';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly usersService: UsersService, // Inject UsersService
  ) {}

   // ✅ Add this endpoint
  @Post('refresh')
  async refreshAll() {
    await this.statsService.refreshAllStats();
    return { message: 'Stats refreshed' };
  }

  @Get('performer/:userId')
  async getPerformerStats(@Param('userId', ParseIntPipe) userId: number) {
    try {
      return await this.statsService.getPerformerStats(userId.toString());
    } catch (error: any) {
      if (error.status === 404) {
        // 1. Find the user object first
       const user = await this.usersService.findOneBy({ id: userId });
        if (!user) throw new NotFoundException('User not found');

        // 2. Pass the user object to the service
        await this.statsService.createInitialStats(user);
        
        // 3. Try fetching the stats again
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
      if (error.status === 404) {
        const user = await this.usersService.findOneBy({ id: userId });
        if (!user) throw new NotFoundException('User not found');

        await this.statsService.createInitialStats(user);
        return await this.statsService.getRequesterStats(userId.toString());
      }
      throw error;
    }
  }
}