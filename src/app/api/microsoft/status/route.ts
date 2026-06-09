import { NextRequest, NextResponse } from "next/server";
import { isMicrosoftConnected } from "@/lib/microsoft";

export async function GET(req: NextRequest) {
  const workspace = new URL(req.url).searchParams.get("workspace") || "pro";
  const connected = await isMicrosoftConnected(`julien-${workspace}`);
  return NextResponse.json({ connected });
}
