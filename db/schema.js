import { pgTable, serial, varchar, text, integer, timestamp, numeric } from 'drizzle-orm/pg-core';

export const users = pgTable('users_financial_tracker', {
    id: serial('id').primaryKey(),
    username: varchar('username', { length: 256 }).notNull().unique(),
    password: varchar('password', { length: 256 }).notNull(),
});

export const transactions = pgTable('transactions_financial_tracker', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    nominal: numeric('nominal').notNull(),
    transactionDate: timestamp('transaction_date', { mode: 'string' }).notNull(),
    status: varchar('status', { length: 10, enum: ['income', 'outcome'] }).notNull(),
description: text( 'description' ),
});