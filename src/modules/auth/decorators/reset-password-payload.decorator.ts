import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ResetPasswordPayload } from '@modules/auth/interfaces/';

export const ResetPasswordPayloadDecorator = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ResetPasswordPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.resetPasswordPayload;
  },
);
