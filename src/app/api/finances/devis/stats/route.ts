import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const activites = searchParams.get("activites")?.split(",").filter(Boolean) ?? [];
  const debut = searchParams.get("debut") ?? "";
  const fin = searchParams.get("fin") ?? "";

  const supabase = createSupabaseServiceClient();

  let query = supabase
    .from("interfast_devis_cache")
    .select("client, statut, montant_ht, created_at_interfast");

  if (activites.length > 0) query = query.in("activite", activites);
  if (debut) query = query.gte("created_at_interfast", debut);
  if (fin) query = query.lte("created_at_interfast", fin);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];

  // Top clients
  const clientMap: Record<string, {
    count: number; total_ht: number;
    count_signed: number; ht_signed: number; // acceptés uniquement (Facture Envoyée)
    count_paid: number;   ht_paid: number;   // facturés uniquement (Facture Payée)
  }> = {};
  for (const r of rows) {
    const key = r.client?.trim() || "—";
    if (!clientMap[key]) clientMap[key] = { count: 0, total_ht: 0, count_signed: 0, ht_signed: 0, count_paid: 0, ht_paid: 0 };
    clientMap[key].count++;
    clientMap[key].total_ht += Number(r.montant_ht) || 0;
    if (r.statut === "signed") { clientMap[key].count_signed++; clientMap[key].ht_signed += Number(r.montant_ht) || 0; }
    if (r.statut === "paid")   { clientMap[key].count_paid++;   clientMap[key].ht_paid   += Number(r.montant_ht) || 0; }
  }
  const allClients = Object.entries(clientMap).map(([client, v]) => ({
    client, ...v,
    // Pour l'affichage du sous-texte colonne 1
    count_accepted: v.count_signed + v.count_paid,
    ht_accepted: v.ht_signed + v.ht_paid,
  }));

  // Colonne 1 : tous les devis reçus
  const topClientsDevis = [...allClients]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Colonne 2 : devis acceptés (signed uniquement — prix du devis accepté, pas le marché total)
  const topClientsSigned = [...allClients]
    .filter((c) => c.count_signed > 0)
    .sort((a, b) => b.ht_signed - a.ht_signed)
    .slice(0, 10);

  // Colonne 3 : facturés (paid)
  const topClientsPaid = [...allClients]
    .filter((c) => c.count_paid > 0)
    .sort((a, b) => b.ht_paid - a.ht_paid)
    .slice(0, 10);

  // Volume mensuel — Factures Envoyées (signed) + Factures Payées (paid)
  const monthMap: Record<string, { count: number; total_ht: number }> = {};
  for (const r of rows) {
    if (r.statut !== "paid" && r.statut !== "signed") continue;
    if (!r.created_at_interfast) continue;
    const d = new Date(r.created_at_interfast);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap[key]) monthMap[key] = { count: 0, total_ht: 0 };
    monthMap[key].count++;
    monthMap[key].total_ht += Number(r.montant_ht) || 0;
  }
  const byMonth = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));

  return NextResponse.json({ topClientsDevis, topClientsSigned, topClientsPaid, byMonth });
}
