import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  return NextResponse.json({
    MICROSOFT_CLIENT_ID: !!process.env.MICROSOFT_CLIENT_ID,
    MICROSOFT_CLIENT_SECRET: !!process.env.MICROSOFT_CLIENT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    computed_redirect_uri: `${origin}/api/microsoft/callback`,
    nextUrl_origin: origin,
    headers_host: req.headers.get("host"),
    headers_forwarded: req.headers.get("x-forwarded-host"),
  });
}
