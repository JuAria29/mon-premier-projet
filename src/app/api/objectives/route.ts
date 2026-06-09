import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

const USER_ID = "julien";

export async function GET() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("objectives")
    .select("*")
    .eq("user_id", USER_ID)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { level, texte, pct = 0 } = body;

  if (!level) {
    return NextResponse.json({ error: "level requis" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("objectives")
    .upsert(
      { user_id: USER_ID, level, texte, pct, updated_at: new Date().toISOString() },
      { onConflict: "user_id,level" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, texte, pct } = body;

  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (texte !== undefined) updates.texte = texte;
  if (pct !== undefined) updates.pct = pct;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("objectives")
    .update(updates)
    .eq("id", id)
    .eq("user_id", USER_ID)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
