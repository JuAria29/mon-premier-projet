import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const exerciseStart = searchParams.get("exercise_start") || "2025-10-01";
  const supabase = createSupabaseServiceClient();

  const { data } = await supabase
    .from("financial_objectives")
    .select("*")
    .eq("exercise_start", exerciseStart)
    .single();

  return NextResponse.json(data ?? { ca_objectif: null, marge_objectif: null });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createSupabaseServiceClient();

    const { error } = await supabase.from("financial_objectives").upsert({
      exercise_start: body.exercise_start,
      ca_objectif: body.ca_objectif ?? null,
      marge_objectif: body.marge_objectif ?? null,
      updated_at: new Date().toISOString(),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
