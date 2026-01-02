import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import schema from '@common/database/schemas';
import { DatabaseConnection } from '@common/database/db.provider';
import { Logger } from 'nestjs-pino';


export interface DrizzleConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
  max?: number;
  ssl?: boolean;
}

export async function createDrizzle(
  config: DrizzleConfig,
  logger: Logger,
): Promise<DatabaseConnection> {
  const pool = new Pool({
    user: config.user,
    host: config.host,
    database: config.database,
    password: config.password,
    port: config.port,
    max: config.max,
    ssl: config.ssl,
  });

  const db = drizzle(pool, { schema });

  let closed = false;

  const dbWithEnd = Object.assign(db, {
    end: async () => {
      if (closed) return;
      closed = true;
      try {
        await pool.end();
      } catch (error) {
        logger.error('Error closing DB pool', error);
      }
    },
  });

  return dbWithEnd;
}
