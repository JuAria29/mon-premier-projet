import { NextResponse } from "next/server";
import { getEmails } from "@/lib/microsoft";

const USER_ID = "julien";

export async function GET() {
  try {
    const mails = await getEmails(USER_ID, 20);
    return NextResponse.json(mails);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    const status = message === "not_connected" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
