import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("aria_settings").select("key, value");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const settings: Record<string, unknown> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseServiceClient();
  const body = await req.json();

  const rows = Object.entries(body).map(([key, value]) => ({
    key,
    value: value as string,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("aria_settings")
    .upsert(rows, { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
