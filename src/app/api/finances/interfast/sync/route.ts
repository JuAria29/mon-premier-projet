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
      // Brouillons — colonnes optionnelles (ajoutées via migration SQL)
      ...(body.brouillons_count !== undefined && {
        brouillons_count: body.brouillons_count,
        brouillons_total: body.brouillons_total ?? 0,
        brouillons_oldest_days: body.brouillons_oldest_days ?? 0,
        brouillons_items: body.brouillons_items ?? [],
      }),
      // Activités — colonnes v1 (ca_reel/prev)
      ...(body.ca_reel_maintenance !== undefined && {
        ca_reel_maintenance: body.ca_reel_maintenance,
        ca_prev_maintenance: body.ca_prev_maintenance ?? 0,
      }),
      // Activités — colonnes v2 détaillées (migration SQL séparée)
      ...(body.mo_reel_maintenance !== undefined && {
        mo_reel_maintenance: body.mo_reel_maintenance,
        fournitures_reel_maintenance: body.fournitures_reel_maintenance ?? 0,
        devis_signes_maintenance: body.devis_signes_maintenance ?? 0,
        retards_maintenance: body.retards_maintenance ?? 0,
      }),
      // Devis à faire suite à intervention (migration SQL séparée)
      ...(body.devis_a_faire_count !== undefined && {
        devis_a_faire_count: body.devis_a_faire_count,
        devis_a_faire_total: body.devis_a_faire_total ?? 0,
        devis_a_faire_items: body.devis_a_faire_items ?? [],
      }),
      synced_at: new Date().toISOString(),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
