import { NextRequest, NextResponse } from "next/server";
import { getCustomerInvoices, getSupplierInvoices, isPennylaneConfigured } from "@/lib/pennylane";
import { getAllFiscalYears, getCurrentFiscalYear } from "@/lib/fiscal";
import type { PLInvoice } from "@/lib/pennylane";

export interface PLHistoryEntry {
  startYear: number;
  label: string;
  start: string;
  end: string;
  isCurrent: boolean;
  ca_ht: number;
  charges_fournisseurs: number;
  resultat_partiel: number; // CA - charges fournisseurs (hors salaires/amortissements)
  invoice_count: number;
  charge_count: number;
  monthly_ca: Record<string, number>; // "2025-10" → amount
  status_breakdown: Record<string, number>; // paid/draft/etc → amount
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const since = parseInt(searchParams.get("since") || "2018");

  if (!await isPennylaneConfigured()) {
    return NextResponse.json({ connected: false, history: [] });
  }

  const allYears = getAllFiscalYears(since);
  const currentFY = getCurrentFiscalYear();

  // Fetch all years in parallel (max 8 concurrent)
  const results = await Promise.allSettled(
    allYears.map(async (fy): Promise<PLHistoryEntry> => {
      const [invoices, charges] = await Promise.all([
        getCustomerInvoices(fy.start, fy.end),
        getSupplierInvoices(fy.start, fy.end),
      ]);

      const ca_ht = invoices.reduce((s, i) => s + i.amountHT, 0);
      const charges_ht = charges.reduce((s, c) => s + c.amountHT, 0);

      // Monthly breakdown for CA
      const monthly_ca: Record<string, number> = {};
      for (const inv of invoices) {
        const key = inv.date.slice(0, 7);
        monthly_ca[key] = (monthly_ca[key] || 0) + inv.amountHT;
      }

      // Status breakdown
      const status_breakdown: Record<string, number> = {};
      for (const inv of invoices) {
        status_breakdown[inv.status] = (status_breakdown[inv.status] || 0) + inv.amountHT;
      }

      return {
        startYear: fy.startYear,
        label: fy.label,
        start: fy.start,
        end: fy.end,
        isCurrent: fy.startYear === currentFY.startYear,
        ca_ht,
        charges_fournisseurs: charges_ht,
        resultat_partiel: ca_ht - charges_ht,
        invoice_count: invoices.length,
        charge_count: charges.length,
        monthly_ca,
        status_breakdown,
      };
    })
  );

  const history = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      startYear: allYears[i].startYear,
      label: allYears[i].label,
      start: allYears[i].start,
      end: allYears[i].end,
      isCurrent: allYears[i].startYear === currentFY.startYear,
      ca_ht: 0,
      charges_fournisseurs: 0,
      resultat_partiel: 0,
      invoice_count: 0,
      charge_count: 0,
      monthly_ca: {},
      status_breakdown: {},
      error: r.reason instanceof Error ? r.reason.message : "Erreur",
    } as PLHistoryEntry;
  });

  return NextResponse.json({ connected: true, history });
}
