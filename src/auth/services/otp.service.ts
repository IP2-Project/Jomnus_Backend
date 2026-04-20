import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OtpService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;

  constructor(private configService: ConfigService) {}

  generateOtp(): string {
    const otp = Math.floor(Math.random() * 999999)
      .toString()
      .padStart(this.OTP_LENGTH, '0');
    return otp;
  }

  getOtpExpiry(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + this.OTP_EXPIRY_MINUTES);
    return expiry;
  }

  isOtpExpired(expiryDate: Date): boolean {
    return new Date() > expiryDate;
  }

  validateOtp(otp: string): boolean {
    return /^\d{6}$/.test(otp);
  }
}
