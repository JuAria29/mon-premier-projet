import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

interface StatItem {
  id: string;
  debut: string;
  fin: string;
  devis_signes_ht?: number;
  devis_reel_ht?: number;
  devis_previsionnel_ht?: number;
  devis_achats?: number;
  ca_reel_ht?: number;
  ca_previsionnel_ht?: number;
  ca_main_oeuvre?: number;
  ca_fournitures?: number;
  ca_en_retard_ht?: number;
  marge_reelle?: number;
  marge_previsionnelle?: number;
}

export async function POST(req: NextRequest) {
  const { stats }: { stats: StatItem[] } = await req.json();

  if (!Array.isArray(stats) || stats.length === 0)
    return NextResponse.json({ error: "No stats provided" }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();

  const rows = stats.map((s) => ({ ...s, synced_at: now }));

  const { error } = await supabase
    .from("interfast_stats_cache")
    .upsert(rows, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, synced: rows.length });
}
