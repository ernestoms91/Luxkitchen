import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';
import { DATABASE_CONNECTION } from '@/common/database/db.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@/modules/auth/entities';
import { eq } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof schema>,
    @Inject(ConfigService)
    configService: ConfigService,
  ) {
    super({
      secretOrKey: configService.get<string>('JWT_SECRET')!,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(payload: JwtPayload) {
    const { id, tokenVersion } = payload;

    if (!id) {
      throw new UnauthorizedException('Token inválido (sin ID)');
    }

    const [user] = await this.database
      .select()
      .from(schema.usersSchema)
      .where(eq(schema.usersSchema.id, Number(id)));

    if (!user) {
      throw new UnauthorizedException('Token not valid');
    }

    if (tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException('Token not valid');
    }

    if (!user.active) {
      throw new UnauthorizedException('User is inactive, contact admin!');
    }

    return user;
  }
}
