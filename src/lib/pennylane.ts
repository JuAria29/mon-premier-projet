import { createSupabaseServiceClient } from "@/lib/supabase";

const PL_BASE = "https://app.pennylane.com/api/external/v2";
const USER_ID = "julien";

async function getToken(): Promise<string> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("user_integrations")
      .select("api_token")
      .eq("user_id", USER_ID)
      .eq("service", "pennylane")
      .single();
    if (data?.api_token) return data.api_token;
  } catch { /* fall through */ }

  const envToken = process.env.PENNYLANE_API_TOKEN;
  if (envToken) return envToken;
  throw new Error("Pennylane non configuré");
}

async function plFetch(path: string): Promise<unknown> {
  const token = await getToken();
  const res = await fetch(`${PL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pennylane ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export interface PLInvoice {
  id: string;
  date: string;
  deadline: string | null;
  status: string;
  amountTTC: number;
  amountHT: number;
  label: string;
  customerName: string | null;
}

// V2 API — amounts are strings, supplier is a URL reference (no inline name)
type RawPLV2Invoice = {
  id?: number | string;
  date?: string;
  deadline?: string | null;
  label?: string;
  invoice_number?: string;
  // V2: amounts are strings
  currency_amount?: string | number;
  currency_amount_before_tax?: string | number;
  currency_tax?: string | number;
  amount?: string | number;
  // V2 status is payment_status
  payment_status?: string;
  status?: string;
  accounting_status?: string;
  // V2: supplier/customer is a URL reference, not inline
  supplier?: { id?: number; url?: string };
  customer?: { id?: number; url?: string; name?: string };
  thirdparty_name?: string;
};

function toFloat(v: string | number | undefined | null): number {
  if (v == null) return 0;
  return parseFloat(String(v)) || 0;
}

function mapInvoice(raw: RawPLV2Invoice): PLInvoice {
  const amountHT = toFloat(raw.currency_amount_before_tax);
  const amountTTC = toFloat(raw.currency_amount ?? raw.amount);
  // Use label or invoice_number as display name since supplier name requires a separate API call
  const customerName = raw.thirdparty_name ?? raw.customer?.name ?? null;
  const status = raw.payment_status ?? raw.status ?? raw.accounting_status ?? "unknown";

  return {
    id: String(raw.id ?? ""),
    date: raw.date ?? "",
    deadline: raw.deadline ?? null,
    status,
    amountTTC,
    amountHT,
    label: raw.label ?? raw.invoice_number ?? "",
    customerName,
  };
}

// V2 uses cursor-based pagination; date filter format is not supported as nested hash.
// We fetch all and filter client-side by date range.
async function fetchAll(endpoint: string, from: string, to: string): Promise<PLInvoice[]> {
  const all: PLInvoice[] = [];
  let cursor: string | null = null;

  while (true) {
    const params = new URLSearchParams({ per_page: "100" });
    if (cursor) params.set("cursor", cursor);

    const data = (await plFetch(`/${endpoint}?${params}`)) as Record<string, unknown>;
    const items = (data.items as RawPLV2Invoice[] | undefined) ?? [];

    // Filter client-side: keep invoices whose date falls within [from, to]
    const filtered = items.filter((i) => {
      const d = i.date ?? "";
      return d >= from && d <= to;
    });

    all.push(...filtered.map(mapInvoice));

    const hasMore = data.has_more as boolean | undefined;
    const nextCursor = data.next_cursor as string | undefined;
    if (!hasMore || !nextCursor || items.length === 0) break;
    cursor = nextCursor;
  }

  return all;
}

// Customer invoices: may be 0 if invoicing is handled via Interfast (CA comes from Interfast)
export async function getCustomerInvoices(from: string, to: string): Promise<PLInvoice[]> {
  return fetchAll("customer_invoices", from, to);
}

// Supplier invoices: charges fournisseurs — main Pennylane data source
export async function getSupplierInvoices(from: string, to: string): Promise<PLInvoice[]> {
  return fetchAll("supplier_invoices", from, to);
}

export async function isPennylaneConfigured(): Promise<boolean> {
  try {
    await getToken();
    return true;
  } catch {
    return false;
  }
}
