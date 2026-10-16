import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', {
 userId:text('user_id').notNull(),id:text('id').notNull(),kind:text('kind').notNull(),payload:text('payload').notNull(),version:integer('version').notNull().default(1)
}, t=>[primaryKey({columns:[t.userId,t.id]})]);
