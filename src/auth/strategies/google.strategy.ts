import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const nodeEnv =
      configService.get<string>('NODE_ENV') || process.env.NODE_ENV || 'development';

    const appUrl = (configService.get<string>('APP_URL') || '').replace(/\/+$/, '');
    const callbackURL =
      configService.get<string>('GOOGLE_CALLBACK_URL') ||
      (appUrl ? `${appUrl}/api/auth/google/callback` : undefined) ||
      (nodeEnv === 'production'
        ? 'https://jomnusapi.gic26.tech/api/auth/google/callback'
        : 'http://localhost:3222/api/auth/google/callback');

    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL,
      scope: ['email', 'profile'],
      prompt: 'consent select_account',
      accessType: 'offline',
      includeGrantedScopes: false,
    } as any);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { emails, displayName, photos } = profile;
    const email = emails[0].value;
    const profileImage =
      photos && photos.length > 0 ? photos[0].value : undefined;

    const user = await this.authService.validateOrCreateGoogleUser({
      email,
      fullName: displayName,
      profileImage,
    });

    done(null, user);
  }
}
