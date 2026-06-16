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

type RawPLInvoice = {
  id?: string;
  date?: string;
  deadline?: string | null;
  status?: string;
  amount?: number;
  currency_amount?: number;
  currency_amount_before_tax?: number;
  amount_excluding_tax?: number;
  total_excl_tax?: number;
  label?: string;
  thirdparty_name?: string;
  customer?: { name?: string; customer_name?: string };
};

function mapInvoice(raw: RawPLInvoice): PLInvoice {
  const amountTTC = raw.currency_amount ?? raw.amount ?? 0;
  const amountHT =
    raw.currency_amount_before_tax ??
    raw.amount_excluding_tax ??
    raw.total_excl_tax ??
    amountTTC;
  const customerName =
    raw.thirdparty_name ??
    raw.customer?.customer_name ??
    raw.customer?.name ??
    null;
  return {
    id: raw.id ?? "",
    date: raw.date ?? "",
    deadline: raw.deadline ?? null,
    status: raw.status ?? "unknown",
    amountTTC,
    amountHT,
    label: raw.label ?? "",
    customerName,
  };
}

async function fetchAll(endpoint: string, from: string, to: string): Promise<PLInvoice[]> {
  const all: PLInvoice[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      "filter[date][gt]": from,
      "filter[date][lt]": to,
      per_page: "100",
      page: String(page),
    });

    const data = (await plFetch(`/${endpoint}?${params}`)) as Record<string, unknown>;

    const items =
      (data[endpoint] as RawPLInvoice[] | undefined) ??
      (data.invoices as RawPLInvoice[] | undefined) ??
      [];

    all.push(...items.map(mapInvoice));

    const meta = data.meta as { total_pages?: number } | undefined;
    if (!meta?.total_pages || page >= meta.total_pages || items.length === 0) break;
    page++;
  }

  return all;
}

export async function getCustomerInvoices(from: string, to: string): Promise<PLInvoice[]> {
  return fetchAll("customer_invoices", from, to);
}

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
