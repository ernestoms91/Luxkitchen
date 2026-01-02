import {
  pgTable as table,
  varchar,
  timestamp,
  serial,
  integer,
} from 'drizzle-orm/pg-core';
import { usersSchema } from '@modules/auth/entities/user.entity';

export const activationTokenSchema = table('activation_tokens', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id')
    .notNull()
    .unique()
    .references(() => usersSchema.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
