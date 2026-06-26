import { NextRequest, NextResponse } from "next/server";
import { getNotePages, getNoteContent } from "@/lib/microsoft";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspace = searchParams.get("workspace") || "pro";
    const userId = `julien-${workspace}`;
    const noteId = searchParams.get("id");

    if (noteId) {
      const content = await getNoteContent(userId, noteId);
      return NextResponse.json({ content });
    }

    const pages = await getNotePages(userId);
    return NextResponse.json(pages);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    const status = message === "not_connected" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
