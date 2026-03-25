import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginAuthDto } from './dto/login.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordDTO } from './dto/forgotpassword.dto';
import { ResetPasswordDTO } from './dto/resetpassword-auth.dto';
import { UsersService } from '@/users/users.service';
import { UserEntity } from './entity/user.entity';
import { EmailService } from './services/email.service';
import { OtpService } from './services/otp.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private otpService: OtpService,
  ) {}

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
    const user = await this.usersService.create(registerDto);
    return this.generateTokens(user);
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<AuthResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.generateTokens(user);
  }

  private async generateTokens(user: UserEntity): Promise<AuthResponseDto> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async logout(userId: string): Promise<void> {
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
        user.firstName || user.email,
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
        user.firstName || user.email,
      );
    } catch (error) {
      console.error('Failed to send success email:', error);
    }

    return {
      message:
        'Password reset successfully. You can now log in with your new password.',
    };
  }
}
