import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createSupabaseServiceClient();

    const { error } = await supabase.from("interfast_stats_cache").upsert({
      exercise_start: body.exercise_start,
      exercise_end: body.exercise_end,
      // CA
      ca_reel: body.ca_reel ?? 0,
      ca_previsionnel: body.ca_previsionnel ?? 0,
      mo_reel: body.mo_reel ?? 0,
      fournitures_reel: body.fournitures_reel ?? 0,
      retards: body.retards ?? 0,
      tva_reel: body.tva_reel ?? 0,
      achats: body.achats ?? 0,
      // Pipeline devis
      devis_signes: body.devis_signes ?? 0,           // montant HT signés
      devis_signes_count: body.devis_signes_count ?? 0,
      devis_envoyes_count: body.devis_envoyes_count ?? 0,
      devis_envoyes_total: body.devis_envoyes_total ?? 0,
      devis_refuses_count: body.devis_refuses_count ?? 0,
      devis_previsionnel_total: body.devis_previsionnel_total ?? 0,
      devis_reel_total: body.devis_reel_total ?? 0,
      // Chantiers
      chantiers_non_demarre: body.chantiers_non_demarre ?? 0,
      chantiers_en_cours: body.chantiers_en_cours ?? 0,
      chantiers_termines: body.chantiers_termines ?? 0,
      synced_at: new Date().toISOString(),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
