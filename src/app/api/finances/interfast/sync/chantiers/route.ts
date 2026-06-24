import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

interface ChantierItem {
  id: string;
  reference?: string;
  titre?: string;
  client?: string;
  adresse?: string;
  statut: string;
  date_debut?: string;
  date_fin_prevue?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const chantiers: ChantierItem[] = body.chantiers ?? [];

    if (!Array.isArray(chantiers) || chantiers.length === 0) {
      return NextResponse.json({ error: "No chantiers provided" }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const now = new Date().toISOString();

    const rows = chantiers.map((c) => ({
      id: c.id,
      reference: c.reference ?? null,
      titre: c.titre ?? null,
      client: c.client ?? null,
      adresse: c.adresse ?? null,
      statut: c.statut,
      date_debut: c.date_debut ?? null,
      date_fin_prevue: c.date_fin_prevue ?? null,
      synced_at: now,
    }));

    const { error } = await supabase
      .from("interfast_chantiers_cache")
      .upsert(rows, { onConflict: "id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, synced: rows.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
