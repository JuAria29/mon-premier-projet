import { NextRequest, NextResponse } from "next/server";
import { getTasks, getTaskLists, completeTask, createTask, deleteTask, updateTaskTitle } from "@/lib/microsoft";

const USER_ID = "julien";

function errResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Erreur inconnue";
  const status = message === "not_connected" ? 401 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("lists") === "1") {
      const lists = await getTaskLists(USER_ID);
      return NextResponse.json(lists);
    }
    const tasks = await getTasks(USER_ID);
    return NextResponse.json(tasks);
  } catch (err) {
    return errResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { listId, title, dueDate } = await req.json();
    if (!listId || !title) return NextResponse.json({ error: "listId et title requis" }, { status: 400 });
    const task = await createTask(USER_ID, listId, title, dueDate);
    return NextResponse.json(task);
  } catch (err) {
    return errResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { listId, taskId, action, title } = body;
    if (!listId || !taskId) return NextResponse.json({ error: "listId et taskId requis" }, { status: 400 });

    if (action === "rename" && title) {
      await updateTaskTitle(USER_ID, listId, taskId, title);
    } else {
      await completeTask(USER_ID, listId, taskId);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { listId, taskId } = await req.json();
    if (!listId || !taskId) return NextResponse.json({ error: "listId et taskId requis" }, { status: 400 });
    await deleteTask(USER_ID, listId, taskId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errResponse(err);
  }
}
