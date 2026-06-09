import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    MICROSOFT_TENANT_ID: !!process.env.MICROSOFT_TENANT_ID,
    MICROSOFT_CLIENT_ID: !!process.env.MICROSOFT_CLIENT_ID,
    MICROSOFT_CLIENT_SECRET: !!process.env.MICROSOFT_CLIENT_SECRET,
    MICROSOFT_REDIRECT_URI: !!process.env.MICROSOFT_REDIRECT_URI,
    REDIRECT_URI_VALUE: process.env.MICROSOFT_REDIRECT_URI ?? "UNDEFINED",
    NODE_ENV: process.env.NODE_ENV,
  });
}
