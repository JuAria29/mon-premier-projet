import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statuts = searchParams.get("statuts")?.split(",").filter(Boolean) ?? [];
  const q = searchParams.get("q") ?? "";
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0"));
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  const supabase = createSupabaseServiceClient();

  // Query principale avec filtres
  let query = supabase
    .from("interfast_devis_cache")
    .select("*", { count: "exact" })
    .order("created_at_interfast", { ascending: false });

  if (statuts.length > 0) {
    query = query.in("statut", statuts);
  }

  if (q.trim()) {
    const safe = q.trim().replace(/'/g, "''");
    query = query.or(
      `titre.ilike.%${safe}%,client.ilike.%${safe}%,reference.ilike.%${safe}%`
    );
  }

  const from = page * limit;
  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Résumé par statut (sans filtre — vision globale)
  const { data: allRows } = await supabase
    .from("interfast_devis_cache")
    .select("statut, montant_ht");

  const summary: Record<string, { count: number; total: number }> = {};
  for (const row of allRows ?? []) {
    const s = row.statut ?? "unknown";
    if (!summary[s]) summary[s] = { count: 0, total: 0 };
    summary[s].count++;
    summary[s].total += Number(row.montant_ht) || 0;
  }

  return NextResponse.json({
    devis: data ?? [],
    count: count ?? 0,
    page,
    limit,
    summary,
    total: (allRows ?? []).length,
  });
}
