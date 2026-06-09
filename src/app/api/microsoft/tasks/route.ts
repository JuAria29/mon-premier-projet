import { NextRequest, NextResponse } from "next/server";
import { getTasks, completeTask } from "@/lib/microsoft";

const USER_ID = "julien";

export async function GET() {
  try {
    const tasks = await getTasks(USER_ID);
    return NextResponse.json(tasks);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    const status = message === "not_connected" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { listId, taskId } = await req.json();
    if (!listId || !taskId) {
      return NextResponse.json({ error: "listId et taskId requis" }, { status: 400 });
    }
    await completeTask(USER_ID, listId, taskId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    const status = message === "not_connected" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
