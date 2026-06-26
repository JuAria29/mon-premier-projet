import { NextRequest, NextResponse } from "next/server";
import { getNoteContent } from "@/lib/microsoft";
import { analyzeNote } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const { noteId, title, ton = "direct", workspace = "pro" } = await req.json();
    if (!noteId || !title) {
      return NextResponse.json({ error: "noteId et title requis" }, { status: 400 });
    }
    const userId = `julien-${workspace}`;
    const content = await getNoteContent(userId, noteId);
    const result = await analyzeNote(title, content, ton);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    const status = message === "not_connected" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
