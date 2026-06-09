import { NextResponse } from "next/server";

export async function GET() {
  // VERCEL_DEPLOYMENT_ID is unique per Vercel deployment
  const version = process.env.VERCEL_DEPLOYMENT_ID || process.env.BUILD_ID || "dev";
  return NextResponse.json({ version });
}
