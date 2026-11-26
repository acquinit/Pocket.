import { readFileSync } from "node:fs";
import postgres from "postgres";
import { loadEnvFiles } from "./load-env.mjs";

loadEnvFiles();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const userId = await resolveUserId();
const dump = JSON.parse(
  readFileSync(new URL("../outputs/local-records.json", import.meta.url), "utf8"),
);
const rows = Array.isArray(dump.records) ? dump.records : [];
if (!rows.length) throw new Error("No records found in outputs/local-records.json.");

const sql = postgres(connectionString, { prepare: false, max: 1, ssl: "require" });
for (const row of rows) {
  await sql`
    insert into public.records (user_id, id, kind, payload, version)
    values (${userId}::uuid, ${row.id}, ${row.kind}, ${JSON.stringify(row.payload)}, ${row.version})
    on conflict (user_id, id) do update
      set kind = excluded.kind,
          payload = excluded.payload,
          version = excluded.version
  `;
}
await sql.end();
console.log(`Imported ${rows.length} records for user ${userId}.`);

async function resolveUserId() {
  if (process.env.SUPABASE_USER_ID) return process.env.SUPABASE_USER_ID;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.SUPABASE_USER_EMAIL;
  if (!url || !serviceKey || !email) {
    throw new Error(
      "Set SUPABASE_USER_ID, or set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_USER_EMAIL.",
    );
  }

  const response = await fetch(`${url}/auth/v1/admin/users`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!response.ok) {
    throw new Error(`Could not list users: ${response.status} ${await response.text()}`);
  }
  const body = await response.json();
  const user = (body.users ?? []).find(
    (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!user) throw new Error(`No Supabase user found for ${email}.`);
  return user.id;
}
