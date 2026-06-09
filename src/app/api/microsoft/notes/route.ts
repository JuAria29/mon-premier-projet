import { NextResponse } from "next/server";
import { getNotePages } from "@/lib/microsoft";

const USER_ID = "julien";

export async function GET() {
  try {
    const pages = await getNotePages(USER_ID);
    return NextResponse.json(pages);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    const status = message === "not_connected" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
