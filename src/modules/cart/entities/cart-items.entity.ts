import { productsSchema } from '@/modules/product/entities';
import {
  decimal,
  integer,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { cartsSchema } from './cart.entity';

export const cartItemsSchema = pgTable('cart_items', {
  id: uuid('id').primaryKey().defaultRandom(),

  cartId: uuid('cart_id')
    .references(() => cartsSchema.id, { onDelete: 'cascade' })
    .notNull(),

  productId: uuid('product_id')
    .references(() => productsSchema.id, { onDelete: 'cascade' })
    .notNull(),

  quantity: integer('quantity').notNull().default(1),

  priceAtTime: decimal('price_at_time', { precision: 10, scale: 2 })
    .notNull()
    .$type<string>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
