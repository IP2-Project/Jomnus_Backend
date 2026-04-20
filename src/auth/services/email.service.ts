import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Convert SMTP_SECURE string to boolean
    const smtpSecure =
      this.configService.get<string>('SMTP_SECURE', 'false').toLowerCase() ===
      'true';

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: smtpSecure,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
  }

  async sendPasswordResetEmail(
    email: string,
    otp: string,
    userName?: string,
  ): Promise<void> {
    const subject = 'Password Reset Request';
    const html = this.getPasswordResetTemplate(otp, userName);

    await this.transporter.sendMail({
      from: this.configService.get<string>('SMTP_FROM_EMAIL'),
      to: email,
      subject,
      html,
    });
  }

  async sendPasswordResetSuccessEmail(
    email: string,
    userName?: string,
  ): Promise<void> {
    const subject = 'Password Reset Successful';
    const html = this.getPasswordResetSuccessTemplate(userName);

    await this.transporter.sendMail({
      from: this.configService.get<string>('SMTP_FROM_EMAIL'),
      to: email,
      subject,
      html,
    });
  }

  private getPasswordResetTemplate(otp: string, userName?: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hello ${userName || 'User'},</p>
        <p>We received a request to reset your password. Use the OTP below to reset your password:</p>
        
        <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <h1 style="color: #333; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        
        <p><strong>Important:</strong> This OTP will expire in 10 minutes.</p>
        <p>If you didn't request a password reset, please ignore this email.</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply to this message.</p>
      </div>
    `;
  }

  private getPasswordResetSuccessTemplate(userName?: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Successful</h2>
        <p>Hello ${userName || 'User'},</p>
        <p>Your password has been successfully reset. You can now log in with your new password.</p>
        
        <p>If you didn't reset your password or have any concerns about your account security, please contact our support team immediately.</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply to this message.</p>
      </div>
    `;
  }
}
