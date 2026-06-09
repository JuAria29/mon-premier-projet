import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ error: "MICROSOFT_CLIENT_ID manquant" }, { status: 500 });
  }

  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/microsoft/callback`;

  const scopes = [
    "User.Read",
    "Mail.Read",
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
  });

  // "common" = multi-tenant : accepte tout compte Microsoft (pro + perso)
  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
  return NextResponse.redirect(authUrl);
}
