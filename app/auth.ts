import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeRelativeReturnPath } from "@/lib/return-path";
import { createClient } from "@/lib/supabase/server";

export type AppUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

export async function getAppUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const authorization = (await headers()).get("authorization");
  const { data, error } = authorization?.startsWith("Bearer ")
    ? await supabase.auth.getUser(authorization.slice(7))
    : await supabase.auth.getUser();
  const user = data.user;
  if (error || !user) return null;

  const metadataName = user.user_metadata?.full_name;
  const fullName = typeof metadataName === "string" ? metadataName : null;
  return {
    userId: user.id,
    displayName: fullName ?? user.email ?? "You",
    email: user.email ?? "",
    fullName,
  };
}

export async function requireAppUser(returnTo: string): Promise<AppUser> {
  const user = await getAppUser();
  if (user) return user;
  redirect(`/login?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`);
}
