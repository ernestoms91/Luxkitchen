import { Reflector } from '@nestjs/core';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { usersSchema } from '@modules/auth/entities/user.entity';
import { META_ROLES } from '@modules/auth/decorators/role-protected.decorator';
import { InferSelectModel } from 'drizzle-orm';

type User = InferSelectModel<typeof usersSchema>;

@Injectable()
export class UserRoleGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const validRoles: string[] = this.reflector.get(
      META_ROLES,
      context.getHandler(),
    );

    if (!validRoles) return true;
    if (validRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as User;

    if (!user) throw new BadRequestException('User not found');

    for (const role of user.roles) {
      if (validRoles.includes(role)) {
        return true;
      }
    }

    throw new ForbiddenException(
      `User ${user.username} need a valid role: [${validRoles}]`,
    );
  }
}
