import { NextResponse } from "next/server";
import { getTasks } from "@/lib/microsoft";

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
