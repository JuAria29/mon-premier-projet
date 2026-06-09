import { NextRequest, NextResponse } from "next/server";
import { getEmails } from "@/lib/microsoft";
import { analyzeMail } from "@/lib/claude";

const USER_ID = "julien";

export async function POST(req: NextRequest) {
  try {
    const { mailId, ton = "direct" } = await req.json();
    if (!mailId) {
      return NextResponse.json({ error: "mailId requis" }, { status: 400 });
    }

    const mails = await getEmails(USER_ID, 50);
    const mail = mails.find((m) => m.id === mailId);
    if (!mail) {
      return NextResponse.json({ error: "Mail introuvable" }, { status: 404 });
    }

    const result = await analyzeMail(mail, ton);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    const status = message === "not_connected" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
