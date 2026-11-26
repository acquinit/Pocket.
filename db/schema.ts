import {
  integer,
  pgTable,
  primaryKey,
  text,
  uuid,
} from "drizzle-orm/pg-core";

export const records = pgTable(
  "records",
  {
    userId: uuid("user_id").notNull(),
    id: text("id").notNull(),
    kind: text("kind").notNull(),
    payload: text("payload").notNull(),
    version: integer("version").notNull().default(1),
  },
  (table) => [primaryKey({ columns: [table.userId, table.id] })],
);
