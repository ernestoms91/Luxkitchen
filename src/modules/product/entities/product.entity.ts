import { categoriesSchema } from '@/modules/category/entities/category.entity';
import { usersSchema } from '@modules/auth/entities';
import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  boolean as pgBoolean,
} from 'drizzle-orm/pg-core';

export const productsSchema = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  location: text('location').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull().$type<string>(),
  stock: integer('stock').notNull().default(0),
  active: pgBoolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  categoryId: integer('category_id')
    .references(() => categoriesSchema.id)
    .notNull(),
});