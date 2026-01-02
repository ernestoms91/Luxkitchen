import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDrizzle, DrizzleConfig } from './db';
import { Logger } from 'nestjs-pino';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import schema from './schemas';

export const DATABASE_CONNECTION = Symbol('DATABASE_CONNECTION');
export type DatabaseConnection = NodePgDatabase<typeof schema> & {
  end: () => Promise<void>;
};

export const drizzleAsyncProvider: Provider = {
  provide: DATABASE_CONNECTION,
  inject: [ConfigService, Logger],
  useFactory: async (
    configService: ConfigService,
    logger: Logger,
  ): Promise<DatabaseConnection> => {
    const config: DrizzleConfig = {
      user: configService.getOrThrow<string>('DB_USERNAME'),
      host: configService.getOrThrow<string>('DB_HOST'),
      database: configService.getOrThrow<string>('DB_NAME'),
      password: configService.getOrThrow<string>('DB_PASSWORD'),
      port: configService.getOrThrow<number>('DB_PORT'),
      max: configService.get<number>('DB_MAX_CONNECTIONS') ?? 10,
      ssl: configService.get<boolean>('DB_SSL') ?? false,
    };

    return createDrizzle(config, logger);
  },
};
