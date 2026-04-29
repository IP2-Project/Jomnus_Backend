import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '@/users/users.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    const secret = configService.getOrThrow<string>('JWT_SECRET');

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => {
          if (req.cookies && req.cookies.access_token) {
            return req.cookies.access_token;
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    // 1. Fetch user by ID from the database
    const user = await this.usersService.findById(Number(payload.sub));

    // 2. If user doesn't exist at all
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 3. THE SECURITY FIX: Check for 'banned' status
    if (user.status === 'banned') {
      throw new ForbiddenException('Your account has been banned. Please contact support.');
    }

    // 4. Safety check for soft-deleted accounts
    if (user.deletedAt) {
      throw new UnauthorizedException('This account has been deactivated.');
    }

    // 5. Success: Passport attaches this user object to the Request (req.user)
    return user;
  }
}