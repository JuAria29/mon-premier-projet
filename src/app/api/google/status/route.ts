import { NextRequest, NextResponse } from "next/server";
import { isGoogleConnected } from "@/lib/google";

export async function GET(req: NextRequest) {
  const workspace = new URL(req.url).searchParams.get("workspace") || "pro";
  const connected = await isGoogleConnected(`julien-${workspace}`);
  return NextResponse.json({ connected });
}
