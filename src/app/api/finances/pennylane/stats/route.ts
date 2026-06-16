import { NextRequest, NextResponse } from "next/server";
import { getCustomerInvoices, getSupplierInvoices, isPennylaneConfigured } from "@/lib/pennylane";

export async function GET(req: NextRequest) {
  if (!await isPennylaneConfigured()) {
    return NextResponse.json({ connected: false, invoices: [], charges: [] });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || "2025-10-01";
  const to = searchParams.get("to") || "2026-09-30";

  try {
    const [invoices, charges] = await Promise.all([
      getCustomerInvoices(from, to),
      getSupplierInvoices(from, to),
    ]);
    return NextResponse.json({ connected: true, invoices, charges });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur Pennylane";
    return NextResponse.json({ connected: true, error: message }, { status: 500 });
  }
}
