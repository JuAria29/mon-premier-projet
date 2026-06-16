import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

const BASE = "https://app.pennylane.com/api/external/v2";
const USER_ID = "julien";

export async function GET() {
  let token: string | null = null;
  let tokenSource = "none";

  try {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("user_integrations").select("api_token")
      .eq("user_id", USER_ID).eq("service", "pennylane").single();
    if (data?.api_token) { token = data.api_token; tokenSource = "supabase"; }
  } catch { /* ignore */ }

  if (!token && process.env.PENNYLANE_API_TOKEN) { token = process.env.PENNYLANE_API_TOKEN; tokenSource = "env"; }
  if (!token) return NextResponse.json({ error: "Aucun token", tokenSource });

  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  const results: Record<string, unknown> = { tokenSource, tokenPrefix: token.slice(0, 8) + "…" };

  // Test different date filter formats for V2
  const tests: Record<string, string> = {
    "no_filter": `${BASE}/customer_invoices?per_page=2`,
    "filter_min_max": `${BASE}/customer_invoices?per_page=2&filter[min_date]=2025-10-01&filter[max_date]=2026-09-30`,
    "filter_from_to": `${BASE}/customer_invoices?per_page=2&date_from=2025-10-01&date_to=2026-09-30`,
    "filter_issued_after": `${BASE}/customer_invoices?per_page=2&filter[issued_after]=2025-10-01&filter[issued_before]=2026-09-30`,
    "supplier_no_filter": `${BASE}/supplier_invoices?per_page=2`,
  };

  for (const [key, url] of Object.entries(tests)) {
    try {
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) {
        results[key] = { status: res.status, body: (await res.text()).slice(0, 300) };
      } else {
        const json = await res.json() as Record<string, unknown>;
        const items = Array.isArray(json.items) ? json.items : [];
        results[key] = {
          status: 200,
          count: items.length,
          has_more: json.has_more,
          next_cursor: json.next_cursor,
          firstItemKeys: items[0] ? Object.keys(items[0] as object) : [],
          firstItemDate: (items[0] as Record<string, unknown>)?.date,
          firstItemAmount: items[0],
        };
      }
    } catch (e) { results[key] = { error: String(e) }; }
  }

  return NextResponse.json(results);
}
