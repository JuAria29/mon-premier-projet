import { NextRequest, NextResponse } from "next/server";
import { getMailFolders } from "@/lib/microsoft";

export async function GET(req: NextRequest) {
  try {
    const workspace = new URL(req.url).searchParams.get("workspace") || "pro";
    const folders = await getMailFolders(`julien-${workspace}`);
    return NextResponse.json(folders);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    const status = message === "not_connected" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
