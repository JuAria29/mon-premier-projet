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

  // Top clients — montant HT global + décompte signé / facturé
  const clientMap: Record<string, {
    count: number; total_ht: number;
    count_signed: number; ht_signed: number;
    count_paid: number;   ht_paid: number;
  }> = {};
  for (const r of rows) {
    const key = r.client?.trim() || "—";
    if (!clientMap[key]) clientMap[key] = { count: 0, total_ht: 0, count_signed: 0, ht_signed: 0, count_paid: 0, ht_paid: 0 };
    clientMap[key].count++;
    clientMap[key].total_ht += Number(r.montant_ht) || 0;
    if (r.statut === "signed") { clientMap[key].count_signed++; clientMap[key].ht_signed += Number(r.montant_ht) || 0; }
    if (r.statut === "paid")   { clientMap[key].count_paid++;   clientMap[key].ht_paid   += Number(r.montant_ht) || 0; }
  }
  const allClients = Object.entries(clientMap).map(([client, v]) => ({ client, ...v }));

  const topClientsSigned = allClients
    .filter((c) => c.count_signed > 0)
    .sort((a, b) => b.ht_signed - a.ht_signed)
    .slice(0, 10);

  const topClientsPaid = allClients
    .filter((c) => c.count_paid > 0)
    .sort((a, b) => b.ht_paid - a.ht_paid)
    .slice(0, 10);

  // Volume mensuel — uniquement les devis facturés (paid)
  // But : anticiper la charge réelle, pas le volume de chiffrage
  const monthMap: Record<string, { count: number; total_ht: number }> = {};
  for (const r of rows) {
    if (r.statut !== "paid") continue;
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

  return NextResponse.json({ topClientsSigned, topClientsPaid, byMonth });
}
