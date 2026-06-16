import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const workspace = new URL(req.url).searchParams.get("workspace") || "pro";
    const userId = `julien-${workspace}`;
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from("google_tokens")
      .delete()
      .eq("user_id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
