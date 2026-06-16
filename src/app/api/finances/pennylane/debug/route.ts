import { NextResponse } from "next/server";
import { getSupplierInvoices, getCustomerInvoices } from "@/lib/pennylane";
import { getCurrentFiscalYear } from "@/lib/fiscal";

export async function GET() {
  const fy = getCurrentFiscalYear();
  try {
    const [suppliers, customers] = await Promise.all([
      getSupplierInvoices(fy.start, fy.end),
      getCustomerInvoices(fy.start, fy.end),
    ]);

    const totalCharges = suppliers.reduce((s, i) => s + Math.abs(i.amountHT), 0);
    const totalCA = customers.reduce((s, i) => s + i.amountHT, 0);

    return NextResponse.json({
      exercise: fy.label,
      from: fy.start,
      to: fy.end,
      supplier_invoices: {
        count: suppliers.length,
        total_ht: totalCharges,
        sample: suppliers.slice(0, 3).map(i => ({ date: i.date, label: i.label, amountHT: i.amountHT, status: i.status })),
      },
      customer_invoices: {
        count: customers.length,
        total_ht: totalCA,
        note: customers.length === 0 ? "Normal si facturation client via Interfast" : undefined,
        sample: customers.slice(0, 3),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
