import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { DATABASE_CONNECTION, DatabaseConnection } from './db.provider';
import { sql } from 'drizzle-orm';

@Injectable()
export class DBService implements OnModuleDestroy {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: DatabaseConnection,
  ) {}

  async isHealthy() {
    await this.db.execute(sql`SELECT 1`);
    return { status: 'up' };
  }

  async onModuleDestroy() {
    await this.db.end();
  }
}
