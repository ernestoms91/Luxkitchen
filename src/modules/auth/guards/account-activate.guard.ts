import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import schema from '@common/database/schemas';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@common/database/db.provider';
import { Inject } from '@nestjs/common';

@Injectable()
export class ActivateAccountGuard implements CanActivate {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof schema>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.query?.token as string | undefined;

    if (!token) throw new BadRequestException('Activation token query is required');

    const [activationToken] = await this.database
      .select()
      .from(schema.activationToken)
      .where(eq(schema.activationToken.token, token));

    if (!activationToken)
      throw new BadRequestException('Invalid activation token');

    if (activationToken.expires_at < new Date()) {
      throw new BadRequestException('Activation link expired. Please request a new one.');
    }

    // Adjuntamos el userId a la request
    request.activationUserId = activationToken.user_id;
    request.activationToken = activationToken; // opcional, por si quieres borrarlo después

    return true;
  }
}
