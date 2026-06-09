import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

const USER_ID = "julien";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/settings?ms=error", req.url)
    );
  }

  const redirectUri = process.env.MICROSOFT_REDIRECT_URI ?? `${req.nextUrl.origin}/api/microsoft/callback`;

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    }
  );

  if (!tokenRes.ok) {
    const errBody = await tokenRes.json().catch(() => ({}));
    const errMsg = encodeURIComponent(JSON.stringify(errBody));
    return NextResponse.redirect(new URL(`/settings?ms=error&detail=${errMsg}`, req.url));
  }

  const tokens = await tokenRes.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const supabase = createSupabaseServiceClient();
  await supabase.from("microsoft_tokens").upsert({
    user_id: USER_ID,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.redirect(new URL("/settings?ms=connected", req.url));
}
