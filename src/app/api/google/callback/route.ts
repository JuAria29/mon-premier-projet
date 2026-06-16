import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state") || "pro";
  const workspace = state === "perso" ? "perso" : "pro";
  const USER_ID = `julien-${workspace}`;

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/settings?google=error&workspace=${workspace}`, req.url)
    );
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${req.nextUrl.origin}/api/google/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.json().catch(() => ({}));
    const errMsg = encodeURIComponent(JSON.stringify(errBody));
    return NextResponse.redirect(new URL(`/settings?google=error&detail=${errMsg}`, req.url));
  }

  const tokens = await tokenRes.json();
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();

  const supabase = createSupabaseServiceClient();
  await supabase.from("google_tokens").upsert({
    user_id: USER_ID,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.redirect(new URL(`/settings?google=connected&workspace=${workspace}`, req.url));
}
