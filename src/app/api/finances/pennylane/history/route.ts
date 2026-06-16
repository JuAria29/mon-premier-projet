import { NextRequest, NextResponse } from "next/server";
import { getSupplierInvoices } from "@/lib/pennylane";
import { getAllFiscalYears, getCurrentFiscalYear, getFiscalYearFromDate } from "@/lib/fiscal";
import { isPennylaneConfigured } from "@/lib/pennylane";

export interface PLHistoryEntry {
  startYear: number;
  label: string;
  start: string;
  end: string;
  isCurrent: boolean;
  ca_ht: number;            // 0 — CA vient d'Interfast, pas Pennylane
  charges_fournisseurs: number;
  resultat_partiel: number; // -charges_fournisseurs (CA inconnu depuis Pennylane)
  invoice_count: number;
  charge_count: number;
  monthly_charges: Record<string, number>; // "2025-10" → montant charges
  status_breakdown: Record<string, number>;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const since = parseInt(searchParams.get("since") || "2018");

  if (!await isPennylaneConfigured()) {
    return NextResponse.json({ connected: false, history: [] });
  }

  const allYears = getAllFiscalYears(since);
  const currentFY = getCurrentFiscalYear();

  // Initialise une entrée vide par exercice
  const historyMap: Record<number, PLHistoryEntry> = {};
  for (const fy of allYears) {
    historyMap[fy.startYear] = {
      startYear: fy.startYear,
      label: fy.label,
      start: fy.start,
      end: fy.end,
      isCurrent: fy.startYear === currentFY.startYear,
      ca_ht: 0,
      charges_fournisseurs: 0,
      resultat_partiel: 0,
      invoice_count: 0,
      charge_count: 0,
      monthly_charges: {},
      status_breakdown: {},
    };
  }

  // Fetch TOUTES les factures fournisseurs en un seul parcours (cursor pagination)
  // puis on les répartit par exercice fiscal côté serveur
  try {
    const oldestStart = allYears[0]?.start ?? `${since}-10-01`;
    const newestEnd = currentFY.end;

    // Un seul appel qui récupère tout (filtrage client-side sur la période globale)
    const allCharges = await getSupplierInvoices(oldestStart, newestEnd);

    for (const inv of allCharges) {
      if (!inv.date) continue;
      const invDate = new Date(inv.date);
      const fy = getFiscalYearFromDate(invDate);

      if (!historyMap[fy.startYear]) continue; // avant since

      const entry = historyMap[fy.startYear];
      const amt = Math.abs(inv.amountHT); // avoirs inclus en négatif → abs pour total brut

      entry.charge_count += 1;
      entry.charges_fournisseurs += amt;

      const monthKey = inv.date.slice(0, 7);
      entry.monthly_charges[monthKey] = (entry.monthly_charges[monthKey] || 0) + amt;

      const status = inv.status ?? "unknown";
      entry.status_breakdown[status] = (entry.status_breakdown[status] || 0) + amt;
    }
  } catch (err) {
    return NextResponse.json({
      connected: true,
      history: [],
      error: err instanceof Error ? err.message : "Erreur fetch Pennylane",
    });
  }

  // Finalise les résultats (resultat_partiel = -charges car CA non dispo depuis Pennylane)
  const history = allYears.map((fy) => {
    const entry = historyMap[fy.startYear];
    entry.resultat_partiel = -entry.charges_fournisseurs;
    return entry;
  });

  return NextResponse.json({ connected: true, history });
}
