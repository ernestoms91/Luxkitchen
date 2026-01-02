import { Module } from '@nestjs/common';
import {
  DATABASE_CONNECTION,
  drizzleAsyncProvider,
} from '@common/database/db.provider';
import { DBService } from '@/common/database/db.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [drizzleAsyncProvider, DBService],
  exports: [DATABASE_CONNECTION, DBService],
})
export class DatabaseModule {}
