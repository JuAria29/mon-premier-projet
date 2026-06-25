import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

interface DevisItem {
  id: string;
  reference?: string;
  titre?: string;
  client?: string;
  statut: string;
  montant_ht: number;
  montant_ttc: number;
  created_at_interfast?: string;
  created_by?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const devis: DevisItem[] = body.devis ?? [];

    if (!Array.isArray(devis) || devis.length === 0) {
      return NextResponse.json({ error: "No devis provided" }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const now = new Date().toISOString();

    const rows = devis.map((d) => ({
      id: d.id,
      reference: d.reference ?? null,
      titre: d.titre ?? null,
      client: d.client ?? null,
      statut: d.statut,
      montant_ht: d.montant_ht ?? 0,
      montant_ttc: d.montant_ttc ?? 0,
      created_at_interfast: d.created_at_interfast ?? null,
      created_by: d.created_by ?? null,
      synced_at: now,
    }));

    const { error } = await supabase
      .from("interfast_devis_cache")
      .upsert(rows, { onConflict: "id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, synced: rows.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
