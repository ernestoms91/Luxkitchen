import { usersSchema } from '@/modules/auth/entities';
import {
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const cartsSchema = pgTable('carts', {
  id: uuid('id').primaryKey().defaultRandom(),

  userId: integer('user_id')
    .references(() => usersSchema.id, { onDelete: 'cascade' })
    .$type<number | null>(),

  status: varchar('status', { length: 20 }).notNull().default('active'), // active | completed | abandoned

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
