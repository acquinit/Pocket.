import { NextResponse } from "next/server";
import { safeRelativeReturnPath } from "@/lib/return-path";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requested = searchParams.get("return_to") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeRelativeReturnPath(requested)}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=callback`);
}
