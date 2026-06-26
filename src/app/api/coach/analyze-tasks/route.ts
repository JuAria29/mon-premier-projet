import { NextRequest, NextResponse } from "next/server";
import { analyzeTaskList } from "@/lib/claude";
import type { GraphTask } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { tasks, ton = "direct" } = await req.json();
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ error: "tasks requis" }, { status: 400 });
    }
    const result = await analyzeTaskList(tasks as GraphTask[], ton);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
