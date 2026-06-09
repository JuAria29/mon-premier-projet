import { NextRequest, NextResponse } from "next/server";
import { getEmails, deleteMail, sendReply, sendNewMail } from "@/lib/microsoft";

const USER_ID = "julien";

export async function GET() {
  try {
    const mails = await getEmails(USER_ID, 30);
    return NextResponse.json(mails);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    const status = message === "not_connected" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { messageId } = await req.json();
    if (!messageId) return NextResponse.json({ error: "messageId requis" }, { status: 400 });
    await deleteMail(USER_ID, messageId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    const status = message === "not_connected" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, messageId, comment, to, subject, content } = body;

    if (action === "reply") {
      if (!messageId || !comment) return NextResponse.json({ error: "messageId et comment requis" }, { status: 400 });
      await sendReply(USER_ID, messageId, comment);
      return NextResponse.json({ ok: true });
    }

    if (action === "new") {
      if (!to || !subject || !content) return NextResponse.json({ error: "to, subject, content requis" }, { status: 400 });
      await sendNewMail(USER_ID, to, subject, content);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "action inconnue" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    const status = message === "not_connected" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
