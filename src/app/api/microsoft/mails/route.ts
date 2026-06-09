import { NextRequest, NextResponse } from "next/server";
import { getEmails, getEmailsByFolder, deleteMail, sendReply, sendNewMail, moveMailToFolder } from "@/lib/microsoft";

function getUserKey(req: NextRequest) {
  const workspace = new URL(req.url).searchParams.get("workspace") || "pro";
  return `julien-${workspace}`;
}

function errResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Erreur inconnue";
  const status = message === "not_connected" ? 401 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const folder = searchParams.get("folder");
    const mails = folder
      ? await getEmailsByFolder(getUserKey(req), folder)
      : await getEmails(getUserKey(req), 30);
    return NextResponse.json(mails);
  } catch (err) {
    return errResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { messageId, folderId } = await req.json();
    if (!messageId || !folderId) return NextResponse.json({ error: "messageId et folderId requis" }, { status: 400 });
    await moveMailToFolder(getUserKey(req), messageId, folderId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { messageId } = await req.json();
    if (!messageId) return NextResponse.json({ error: "messageId requis" }, { status: 400 });
    await deleteMail(getUserKey(req), messageId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, messageId, comment, to, subject, content } = body;

    if (action === "reply") {
      if (!messageId || !comment) return NextResponse.json({ error: "messageId et comment requis" }, { status: 400 });
      await sendReply(getUserKey(req), messageId, comment);
      return NextResponse.json({ ok: true });
    }

    if (action === "new") {
      if (!to || !subject || !content) return NextResponse.json({ error: "to, subject, content requis" }, { status: 400 });
      await sendNewMail(getUserKey(req), to, subject, content);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "action inconnue" }, { status: 400 });
  } catch (err) {
    return errResponse(err);
  }
}
