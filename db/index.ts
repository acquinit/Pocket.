import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type GlobalDb = typeof globalThis & {
  __pocketSql?: ReturnType<typeof postgres>;
};

const globalDb = globalThis as GlobalDb;

function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add your Supabase pooled connection string to the environment.",
    );
  }
  if (!globalDb.__pocketSql) {
    globalDb.__pocketSql = postgres(connectionString, {
      prepare: false,
      max: 5,
      ssl: "require",
    });
  }
  return globalDb.__pocketSql;
}

export function getDb() {
  return drizzle(getSql(), { schema });
}
