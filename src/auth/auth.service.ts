import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
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

    // Validate passwords match
    if (registerDto.password !== registerDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Create user with default helper value
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
      // Return generic message for security reasons
      return {
        message: 'If the email exists, a password reset OTP has been sent',
      };
    }

    // Generate OTP
    const otp = this.otpService.generateOtp();
    const otpExpiry = this.otpService.getOtpExpiry();

    // Save OTP to user
    await this.usersService.updateOtp(user.id, otp, otpExpiry);

    // Send OTP via email
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

    // Check if OTP exists and is not expired
    if (!user.otp || !user.otpExpiry) {
      throw new BadRequestException(
        'No active password reset request. Please request a new one.',
      );
    }

    if (this.otpService.isOtpExpired(user.otpExpiry)) {
      // Clear expired OTP
      await this.usersService.updateOtp(user.id, null, null);
      throw new BadRequestException(
        'OTP has expired. Please request a new password reset.',
      );
    }

    // Verify OTP
    if (user.otp !== resetPasswordDto.otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // Validate new password
    if (!this.otpService.validateOtp(resetPasswordDto.otp)) {
      throw new BadRequestException('Invalid OTP format');
    }

    // Update password and clear OTP
    user.password = resetPasswordDto.password;
    await this.usersService.updatePassword(user.id, resetPasswordDto.password);
    await this.usersService.updateOtp(user.id, null, null);

    // Send success email
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
      // Create new user from Google profile
      const generatedUsername = profile.email.split('@')[0];
      const randomPassword = Math.random().toString(36).slice(-20);
      
      user = await this.usersService.create({
        email: profile.email,
        fullName: profile.fullName,
        password: randomPassword,
        // confirmPassword: randomPassword,
      });
    }

    return user;
  }

  async verifyGoogleToken(token: string): Promise<AuthResponseDto> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google token');
      }

      const user = await this.validateOrCreateGoogleUser({
        email: payload.email,
        fullName: payload.given_name || '',
      });

      return this.generateTokens(user);
    } catch (error) {
      console.error('Google token verification failed:', error);
      throw new UnauthorizedException('Invalid Google token');
    }
  }
}
