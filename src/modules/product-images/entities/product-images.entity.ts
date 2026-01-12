import { productsSchema } from '@modules/product/entities/product.entity';
import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  integer,
} from 'drizzle-orm/pg-core';

export const productImagesSchema = pgTable('product_images', {
  id: uuid('id').primaryKey().defaultRandom(),

  productId: uuid('product_id')
    .references(() => productsSchema.id, { onDelete: 'cascade' })
    .notNull(),

  url: varchar('url', { length: 1024 }).notNull(),

  order: integer('order').default(0).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});
