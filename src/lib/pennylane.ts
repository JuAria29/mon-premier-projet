import { createSupabaseServiceClient } from "@/lib/supabase";

const PL_BASE = "https://app.pennylane.com/api/external/v2";
const USER_ID = "julien"; // For multi-user SaaS: replace with auth session user ID

async function getToken(): Promise<string> {
  // Priority 1: token stored in Supabase (per-user SaaS)
  try {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("user_integrations")
      .select("api_token")
      .eq("user_id", USER_ID)
      .eq("service", "pennylane")
      .single();
    if (data?.api_token) return data.api_token;
  } catch {
    // fall through
  }

  // Priority 2: env var fallback (dev / self-hosted)
  const envToken = process.env.PENNYLANE_API_TOKEN;
  if (envToken) return envToken;

  throw new Error("Pennylane non configuré");
}

async function plFetch(path: string): Promise<unknown> {
  const token = await getToken();
  const res = await fetch(`${PL_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
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

// V2 API response shape
type RawPLInvoice = {
  id?: string;
  date?: string;
  deadline?: string | null;
  status?: string;
  // V2 amount fields
  amount?: number;
  currency_amount?: number;
  currency_amount_before_tax?: number;
  amount_excluding_tax?: number;
  total_excl_tax?: number;
  // V2 may nest under invoice
  invoice?: {
    amount?: number;
    currency_amount?: number;
    currency_amount_before_tax?: number;
    label?: string;
    date?: string;
    deadline?: string;
    status?: string;
  };
  label?: string;
  thirdparty_name?: string;
  customer?: { name?: string; customer_name?: string };
  supplier?: { name?: string };
};

function mapInvoice(raw: RawPLInvoice): PLInvoice {
  // V2 may nest data under raw.invoice
  const src = raw.invoice ? { ...raw.invoice, ...raw } : raw;
  const amountTTC = src.currency_amount ?? src.amount ?? 0;
  const amountHT =
    src.currency_amount_before_tax ??
    src.amount_excluding_tax ??
    src.total_excl_tax ??
    amountTTC;
  const customerName =
    raw.thirdparty_name ??
    raw.customer?.customer_name ??
    raw.customer?.name ??
    raw.supplier?.name ??
    null;
  return {
    id: raw.id ?? "",
    date: src.date ?? raw.date ?? "",
    deadline: (src.deadline ?? raw.deadline) ?? null,
    status: src.status ?? raw.status ?? "unknown",
    amountTTC,
    amountHT,
    label: src.label ?? raw.label ?? "",
    customerName,
  };
}

// V2 uses cursor-based pagination and different date filter format
async function fetchAll(endpoint: string, from: string, to: string, dateFilter?: string): Promise<PLInvoice[]> {
  const all: PLInvoice[] = [];
  let cursor: string | null = null;

  while (true) {
    const params = new URLSearchParams({ per_page: "100" });
    if (cursor) params.set("cursor", cursor);

    // Date filter format determined from debug (injected once known)
    if (dateFilter === "min_max") {
      params.set("filter[min_date]", from);
      params.set("filter[max_date]", to);
    } else if (dateFilter === "issued") {
      params.set("filter[issued_after]", from);
      params.set("filter[issued_before]", to);
    }
    // If no dateFilter set, fetch all and filter below

    const data = (await plFetch(`/${endpoint}?${params}`)) as Record<string, unknown>;
    const items = (data.items as RawPLInvoice[] | undefined) ?? [];

    // Client-side date filter fallback when API filter not yet known
    const filtered = dateFilter
      ? items
      : items.filter((i) => {
          const d = i.date ?? i.invoice?.date ?? "";
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

// DATE_FILTER will be set once we confirm the correct format from debug
const DATE_FILTER = undefined; // "min_max" | "issued" | undefined (client-side fallback)

export async function getCustomerInvoices(from: string, to: string): Promise<PLInvoice[]> {
  return fetchAll("customer_invoices", from, to, DATE_FILTER);
}

export async function getSupplierInvoices(from: string, to: string): Promise<PLInvoice[]> {
  return fetchAll("supplier_invoices", from, to, DATE_FILTER);
}

export async function isPennylaneConfigured(): Promise<boolean> {
  try {
    await getToken();
    return true;
  } catch {
    return false;
  }
}
