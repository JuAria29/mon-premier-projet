import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const activites = searchParams.get("activites")?.split(",").filter(Boolean) ?? [];

  const supabase = createSupabaseServiceClient();

  let query = supabase
    .from("interfast_devis_cache")
    .select("client, statut, montant_ht, created_at_interfast");

  if (activites.length > 0) query = query.in("activite", activites);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];

  // Top clients by montant HT
  const clientMap: Record<string, { count: number; total_ht: number }> = {};
  for (const r of rows) {
    const key = r.client?.trim() || "—";
    if (!clientMap[key]) clientMap[key] = { count: 0, total_ht: 0 };
    clientMap[key].count++;
    clientMap[key].total_ht += Number(r.montant_ht) || 0;
  }
  const topClients = Object.entries(clientMap)
    .map(([client, v]) => ({ client, ...v }))
    .sort((a, b) => b.total_ht - a.total_ht)
    .slice(0, 12);

  // Monthly breakdown
  const monthMap: Record<string, { count: number; total_ht: number }> = {};
  for (const r of rows) {
    if (!r.created_at_interfast) continue;
    const d = new Date(r.created_at_interfast);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap[key]) monthMap[key] = { count: 0, total_ht: 0 };
    monthMap[key].count++;
    monthMap[key].total_ht += Number(r.montant_ht) || 0;
  }
  const byMonth = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, v]) => ({ month, ...v }));

  return NextResponse.json({ topClients, byMonth });
}
