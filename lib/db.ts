import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { pgTable, text, timestamp, serial, integer } from 'drizzle-orm/pg-core';

// --- SCHEMA DEFINITION ---

export const userTable = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sessionTable = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => userTable.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { 
    mode: 'date', 
    withTimezone: true 
  }).notNull(),
});

// Adapting to Lucia v3
export const keyTable = pgTable('keys', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => userTable.id, { onDelete: 'cascade' }),
  hashedPassword: text('hashed_password'), // Lucia stores the password here
});

export const chatTable = pgTable('chats', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => userTable.id, { onDelete: 'cascade' }),
  modelName: text('model_name').notNull().default('startup-advisor'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const messageTable = pgTable('messages', {
  id: serial('id').primaryKey(),
  chatId: integer('chat_id').notNull().references(() => chatTable.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- DRIVER SWITCH ---
let dbInstance;

if (process.env.NODE_ENV === 'production') {
  console.log("Using Neon serverless driver for production");
  const sql = neon(process.env.POSTGRES_URL!);
  dbInstance = drizzleNeon(sql, { 
    schema: { userTable, sessionTable, keyTable, chatTable, messageTable } // Added keyTable
  });
} else {
  console.log("Using 'pg' driver for local development");
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL!,
  });
  dbInstance = drizzlePg(pool, { 
    schema: { userTable, sessionTable, keyTable, chatTable, messageTable } // Added keyTable
  });
}

export const db = dbInstance;