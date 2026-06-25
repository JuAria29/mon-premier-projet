import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

// Dans Interfast, les chantiers ont activite = null (pas de tag explicite).
// "chantier" côté UI = IS NULL en base. On inline la logique pour éviter les
// problèmes de typage générique avec PostgrestFilterBuilder.
function buildActiviteFilter(activites: string[]): { type: "none" | "null_only" | "others_only" | "null_and_others"; others: string[] } {
  if (activites.length === 0) return { type: "none", others: [] };
  const wantsChantier = activites.includes("chantier");
  const others = activites.filter((a) => a !== "chantier");
  if (wantsChantier && others.length === 0) return { type: "null_only", others: [] };
  if (!wantsChantier) return { type: "others_only", others };
  return { type: "null_and_others", others };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statuts = searchParams.get("statuts")?.split(",").filter(Boolean) ?? [];
  const activites = searchParams.get("activites")?.split(",").filter(Boolean) ?? [];
  const debut = searchParams.get("debut") ?? "";
  const fin = searchParams.get("fin") ?? "";
  const q = searchParams.get("q") ?? "";
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0"));
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 500);

  const supabase = createSupabaseServiceClient();
  const af = buildActiviteFilter(activites);

  // Query principale avec filtres
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("interfast_devis_cache")
    .select("*", { count: "exact" })
    .order("created_at_interfast", { ascending: false });

  if (statuts.length > 0) query = query.in("statut", statuts);
  if (af.type === "null_only") query = query.is("activite", null);
  else if (af.type === "others_only") query = query.in("activite", af.others);
  else if (af.type === "null_and_others") query = query.or(`activite.is.null,activite.in.(${af.others.join(",")})`);
  if (debut) query = query.gte("created_at_interfast", debut);
  if (fin) query = query.lte("created_at_interfast", fin);

  if (q.trim()) {
    const safe = q.trim().replace(/'/g, "''");
    query = query.or(`titre.ilike.%${safe}%,client.ilike.%${safe}%,reference.ilike.%${safe}%`);
  }

  const from = page * limit;
  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Résumé par statut — filtré par activites + exercice (pour KPIs cohérents)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let summaryQuery: any = supabase
    .from("interfast_devis_cache")
    .select("statut, montant_ht");
  if (af.type === "null_only") summaryQuery = summaryQuery.is("activite", null);
  else if (af.type === "others_only") summaryQuery = summaryQuery.in("activite", af.others);
  else if (af.type === "null_and_others") summaryQuery = summaryQuery.or(`activite.is.null,activite.in.(${af.others.join(",")})`);
  if (debut) summaryQuery = summaryQuery.gte("created_at_interfast", debut);
  if (fin) summaryQuery = summaryQuery.lte("created_at_interfast", fin);
  const { data: summaryRows } = await summaryQuery;

  const summary: Record<string, { count: number; total: number }> = {};
  for (const row of summaryRows ?? []) {
    const s = row.statut ?? "unknown";
    if (!summary[s]) summary[s] = { count: 0, total: 0 };
    summary[s].count++;
    summary[s].total += Number(row.montant_ht) || 0;
  }

  // Total brut sans filtre (pour détecter si des devis sont synchronisés)
  const { count: totalUnfiltered } = await supabase
    .from("interfast_devis_cache")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    devis: data ?? [],
    count: count ?? 0,
    page,
    limit,
    summary,
    total: totalUnfiltered ?? 0,
  });
}
