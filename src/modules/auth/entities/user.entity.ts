import {
  boolean,
  pgTable,
  serial,
  timestamp,
  varchar,
  text,
  integer,
} from 'drizzle-orm/pg-core';

export const usersSchema = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  lastname: varchar('lastname', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 64 }).unique(),
  password: varchar('password', { length: 255 }).notNull(),
  roles: text('roles').array().notNull(),
  location: varchar('location', { length: 255 }).notNull(),
  active: boolean('active').notNull().default(false),
  tokenVersion: integer('token_version').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
