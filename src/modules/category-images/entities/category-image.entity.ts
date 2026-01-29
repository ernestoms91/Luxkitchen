import { categoriesSchema } from '@modules/category/entities/category.entity';
import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  integer,
  serial,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const categoryImagesSchema = pgTable(
  'category_images',
  {
    id: serial('id').primaryKey(),

    categoryId: integer('category_id')
      .references(() => categoriesSchema.id, { onDelete: 'cascade' })
      .notNull(),

    url: varchar('url', { length: 1024 }).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    categoryUnique: uniqueIndex('category_images_category_unique').on(
      t.categoryId,
    ),
  }),
);
