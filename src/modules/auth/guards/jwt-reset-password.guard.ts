import { BadRequestException, CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ResetPasswordPayload } from "@modules/auth/interfaces";

@Injectable()
export class ResetPasswordGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { token } = request.body;

    if (!token) {
      throw new BadRequestException('Token is required');
    }

    try {
      const payload = this.jwtService.verify<ResetPasswordPayload>(token);

      if (payload.type !== 'reset-password') {
        throw new BadRequestException('Invalid token');
      }

      request.resetPasswordPayload = payload;
      return true;
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }
  }
}
