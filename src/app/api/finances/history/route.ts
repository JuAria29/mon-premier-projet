import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("financial_history")
    .select("*")
    .order("exercise_start", { ascending: true });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createSupabaseServiceClient();

    // Parse exercise label (ex: "2024-2025") → exercise_start "2024-10-01"
    let exerciseStart = body.exercise_start;
    if (!exerciseStart && body.exercise_label) {
      const year = body.exercise_label.split(/[-\/]/)[0];
      exerciseStart = `${year}-10-01`;
    }

    const { error } = await supabase.from("financial_history").upsert({
      exercise_start: exerciseStart,
      exercise_label: body.exercise_label,
      ca_ht: body.ca_ht ?? null,
      masse_salariale: body.masse_salariale ?? null,
      charges_vehicules: body.charges_vehicules ?? null,
      frais_generaux: body.frais_generaux ?? null,
      achats_fournitures: body.achats_fournitures ?? null,
      sous_traitance: body.sous_traitance ?? null,
      charges_totales: body.charges_totales ?? null,
      resultat_net: body.resultat_net ?? null,
      tresorerie_fin: body.tresorerie_fin ?? null,
      effectif: body.effectif ?? null,
      notes: body.notes ?? null,
      source: body.source ?? "manual",
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const exerciseStart = searchParams.get("exercise_start");
    if (!exerciseStart) return NextResponse.json({ error: "exercise_start requis" }, { status: 400 });

    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("financial_history").delete().eq("exercise_start", exerciseStart);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
