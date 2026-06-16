import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ error: "MICROSOFT_CLIENT_ID manquant" }, { status: 500 });
  }

  const workspace = new URL(req.url).searchParams.get("workspace") || "pro";
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI ?? `${req.nextUrl.origin}/api/microsoft/callback`;

  const scopes = [
    "User.Read",
    "Mail.Read",
    "Mail.Send",
    "Mail.ReadWrite",
    "Calendars.Read",
    "Calendars.ReadWrite",
    "Tasks.ReadWrite",
    "Notes.Read",
    "offline_access",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes,
    response_mode: "query",
    state: workspace,
    prompt: "select_account",
  });

  // "common" = multi-tenant : accepte tout compte Microsoft (pro + perso)
  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
  return NextResponse.redirect(authUrl);
}
