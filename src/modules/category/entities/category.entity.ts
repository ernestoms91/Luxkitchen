import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';

export const categoriesSchema = pgTable('categories', {
  id: serial('id').primaryKey(),

  name: varchar('name', { length: 100 }).notNull().unique(), // Evita duplicados

  description: text('description'),

  parentId: integer('parent_id')
    .references(() => categoriesSchema.id, { onDelete: 'set null' })
    .$type<number | null>(),

  isLeaf: boolean('is_leaf').notNull().default(true), // Indica si es una subcategoría (hoja)

  isDeleted: boolean('is_deleted').notNull().default(false), // ← SOFT DELETE

  createdAt: timestamp('created_at').defaultNow().notNull(),
});
