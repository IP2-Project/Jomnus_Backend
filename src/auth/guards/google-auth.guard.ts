import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const promptFromQuery = request?.query?.prompt;
    const maxAgeFromQuery = request?.query?.max_age;

    return {
      scope: ['email', 'profile'],
      prompt:
        typeof promptFromQuery === 'string' && promptFromQuery.length > 0
          ? promptFromQuery
          : 'login consent select_account',
      max_age:
        typeof maxAgeFromQuery === 'string' && maxAgeFromQuery.length > 0
          ? Number(maxAgeFromQuery)
          : 0,
      accessType: 'offline',
      includeGrantedScopes: false,
      approval_prompt: 'force',
    };
  }
}
