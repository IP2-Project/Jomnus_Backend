import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Req,
  Res,
} from '@nestjs/common';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { ForgotPasswordDTO } from './dto/forgotpassword.dto';
import { ResetPasswordDTO } from './dto/resetpassword-auth.dto';
import { JwtAuthGuard } from './guards/jwt.auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { UserEntity } from '../users/entity/user.entity';

interface RequestWithUser extends ExpressRequest {
  user: UserEntity;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  private readonly cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };

  private readonly roleCookieOptions = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Admin login' })
  async login(
    @Body() loginDto: LoginAuthDto,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const session = await this.authService.login(loginDto);

    res.cookie('access_token', session.accessToken, {
      ...this.cookieOptions,
      maxAge: 30 * 60 * 1000, // 30 minutes
    });

    res.cookie('refresh_token', session.refreshToken, {
      ...this.cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie('user_role', session.user.role, {
      ...this.roleCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return session;
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new admin (restricted)' })
  async register(@Body() registerDto: RegisterAuthDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@Req() req: RequestWithUser) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  async logout(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    await this.authService.logout(req.user.id);

    // Clear cookies
    res.clearCookie('access_token', this.cookieOptions);
    res.clearCookie('refresh_token', this.cookieOptions);
    res.clearCookie('user_role', this.roleCookieOptions);

    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const refreshToken = req.cookies.refresh_token;
    const session = await this.authService.refreshTokens(
      req.user.id,
      refreshToken,
    );

    res.cookie('access_token', session.accessToken, {
      ...this.cookieOptions,
      maxAge: 30 * 60 * 1000, // 30 minutes
    });

    res.cookie('refresh_token', session.refreshToken, {
      ...this.cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return session;
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset via email OTP' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDTO) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using OTP' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDTO) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  googleAuth(@Request() _req: ExpressRequest) {
    // Passport guard handles redirect to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthCallback(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const user = req.user;
    const session = await this.authService.generateTokens(user);

    res.cookie('access_token', session.accessToken, {
      ...this.cookieOptions,
      maxAge: 30 * 60 * 1000, // 30 minutes
    });

    res.cookie('refresh_token', session.refreshToken, {
      ...this.cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie('user_role', session.user.role, {
      ...this.roleCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.redirect(
      `http://localhost:3000/auth/callback?token=${session.accessToken}&role=${session.user.role}`,
    );
  }

  @Public()
  @Post('google-callback')
  @ApiOperation({ summary: 'Verify Google token and login' })
  async verifyGoogleToken(
    @Body() body: { token: string },
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const session = await this.authService.verifyGoogleToken(body.token);

    res.cookie('access_token', session.accessToken, {
      ...this.cookieOptions,
      maxAge: 30 * 60 * 1000, // 30 minutes
    });

    res.cookie('refresh_token', session.refreshToken, {
      ...this.cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie('user_role', session.user.role, {
      ...this.roleCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return session;
  }
}
