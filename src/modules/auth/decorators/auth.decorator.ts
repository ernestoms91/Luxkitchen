import { applyDecorators, UseGuards } from '@nestjs/common';
import { UserRoleGuard } from '@modules/auth/guards/user-role.guard';
import { ValidRoles } from '@modules/auth/interfaces';
import { RoleProtected } from '@modules/auth/decorators/role-protected.decorator';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

export function Auth(...roles: ValidRoles[]) {
  return applyDecorators(
    RoleProtected(...roles),
    UseGuards(JwtAuthGuard, UserRoleGuard),
  );
}
