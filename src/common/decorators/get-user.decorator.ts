import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If 'id' is passed to the decorator, return user.id. 
    // Otherwise, return the whole user object.
    return data ? user?.[data] : user;
  },
);