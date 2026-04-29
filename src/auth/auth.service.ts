import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { LoginAuthDto } from './dto/login.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordDTO } from './dto/forgotpassword.dto';
import { ResetPasswordDTO } from './dto/resetpassword-auth.dto';
import { UsersService } from '@/users/users.service';
import { UserEntity } from '../users/entity/user.entity';
import { EmailService } from './services/email.service';
import { OtpService } from './services/otp.service';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private otpService: OtpService,
  ) {
    this.googleClient = new OAuth2Client(
      configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserEntity | null> {
    const user = await this.usersService.findByEmail(email);
    
    if (user && (await user.validatePassword(password))) {
      // THE FRONT DOOR BLOCK: Check for ban or deletion before login
      if (user.status === 'banned') {
        throw new ForbiddenException('Login failed: Your account has been banned. Please contact support.');
      }

      if (user.deletedAt) {
        throw new UnauthorizedException('Login failed: This account has been deactivated.');
      }

      return user;
    }
    return null;
  }

  async login(loginDto: LoginAuthDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.generateTokens(user);
  }

  async register(registerDto: RegisterAuthDto): Promise<AuthResponseDto> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    if (registerDto.password !== registerDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.usersService.create(registerDto);
    return this.generateTokens(user);
  }

  async refreshTokens(
    userId: number,
    refreshToken: string,
  ): Promise<AuthResponseDto> {
    const user = await this.usersService.findById(userId);
    
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // BLOCK REFRESH: Kill active sessions for banned users
    if (user.status === 'banned') {
      throw new ForbiddenException('Session expired: Your account is banned.');
    }

    return this.generateTokens(user);
  }

  async generateTokens(user: UserEntity): Promise<AuthResponseDto> {
    const payload = { sub: user.id, email: user.email, role: user.currentRole };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName ?? '',
        role: user.currentRole,
      },
    };
  }

  async logout(userId: number): Promise<void> {
    await this.usersService.updateRefreshToken(userId, '');
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDTO,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);
    if (!user) {
      return {
        message: 'If the email exists, a password reset OTP has been sent',
      };
    }

    const otp = this.otpService.generateOtp();
    const otpExpiry = this.otpService.getOtpExpiry();

    await this.usersService.updateOtp(user.id, otp, otpExpiry);

    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        otp,
        user.fullName || user.email,
      );
    } catch (error) {
      console.error('Failed to send reset email:', error);
      throw new BadRequestException(
        'Failed to send reset email. Please try again later.',
      );
    }

    return {
      message: 'If the email exists, a password reset OTP has been sent',
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDTO,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(resetPasswordDto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.otp || !user.otpExpiry) {
      throw new BadRequestException(
        'No active password reset request. Please request a new one.',
      );
    }

    if (this.otpService.isOtpExpired(user.otpExpiry)) {
      await this.usersService.updateOtp(user.id, null, null);
      throw new BadRequestException(
        'OTP has expired. Please request a new password reset.',
      );
    }

    if (user.otp !== resetPasswordDto.otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (!this.otpService.validateOtp(resetPasswordDto.otp)) {
      throw new BadRequestException('Invalid OTP format');
    }

    user.password = resetPasswordDto.password;
    await this.usersService.updatePassword(user.id, resetPasswordDto.password);
    await this.usersService.updateOtp(user.id, null, null);

    try {
      await this.emailService.sendPasswordResetSuccessEmail(
        user.email,
        user.fullName || user.email,
      );
    } catch (error) {
      console.error('Failed to send success email:', error);
    }

    return {
      message:
        'Password reset successfully. You can now log in with your new password.',
    };
  }

  async validateOrCreateGoogleUser(profile: {
    email: string;
    fullName: string;
  }): Promise<UserEntity> {
    let user = await this.usersService.findByEmail(profile.email);

    if (!user) {
      const generatedUsername = profile.email.split('@')[0];
      const randomPassword = Math.random().toString(36).slice(-20);
      
      user = await this.usersService.create({
        email: profile.email,
        fullName: profile.fullName,
        password: randomPassword,
        confirmPassword: randomPassword,
      });
    }

    return user;
  }

  async verifyGoogleToken(token: string): Promise<AuthResponseDto> {
    try {
      // 1. Await the ticket verification
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token, // Changed from id_token to idToken
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });

      // 2. ticket is now resolved, so getPayload() will exist
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google token');
      }

      const user = await this.validateOrCreateGoogleUser({
        email: payload.email,
        fullName: payload.given_name || '',
      });

      // GOOGLE LOGIN BLOCK: Real-time internal status check
      if (user.status === 'banned') {
        throw new ForbiddenException('Google login failed: Your account has been banned.');
      }

      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      console.error('Google token verification failed:', error);
      throw new UnauthorizedException('Invalid Google token');
    }
  }
}