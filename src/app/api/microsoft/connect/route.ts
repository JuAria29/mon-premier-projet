import { NextResponse } from "next/server";

export async function GET() {
  const tenantId = process.env.MICROSOFT_TENANT_ID!;
  const clientId = process.env.MICROSOFT_CLIENT_ID!;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI!;

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

  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`;
  return NextResponse.redirect(authUrl);
}
