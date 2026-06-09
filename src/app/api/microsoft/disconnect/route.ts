import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

const USER_ID = "julien";

export async function POST() {
  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from("microsoft_tokens")
      .delete()
      .eq("user_id", USER_ID);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
