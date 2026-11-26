import { loadEnvFiles } from "./scripts/load-env.mjs";

loadEnvFiles();

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.SUPABASE_USER_EMAIL;
const password = process.env.SUPABASE_USER_PASSWORD;

if (!url || !anonKey || !email || !password) {
  throw new Error(
    "Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_USER_EMAIL and SUPABASE_USER_PASSWORD before running API tests.",
  );
}

const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: anonKey, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
if (!response.ok) {
  throw new Error(`Supabase sign-in failed: ${response.status} ${await response.text()}`);
}
const body = await response.json();
if (!body.access_token) throw new Error("Supabase did not return an access token.");

export const auth = { Authorization: `Bearer ${body.access_token}` };
