import { NextRequest, NextResponse } from "next/server";
import { getCalendarEvents, createCalendarEvent, deleteCalendarEvent } from "@/lib/microsoft";

const USER_ID = "julien";

function errResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Erreur inconnue";
  const status = message === "not_connected" ? 401 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || new Date().toISOString();
    const to = searchParams.get("to") || new Date(Date.now() + 7 * 86400000).toISOString();
    const events = await getCalendarEvents(USER_ID, from, to);
    return NextResponse.json(events);
  } catch (err) {
    return errResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { subject, start, end, location, body } = await req.json();
    if (!subject || !start || !end) return NextResponse.json({ error: "subject, start, end requis" }, { status: 400 });
    await createCalendarEvent(USER_ID, subject, start, end, location, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { eventId } = await req.json();
    if (!eventId) return NextResponse.json({ error: "eventId requis" }, { status: 400 });
    await deleteCalendarEvent(USER_ID, eventId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errResponse(err);
  }
}
