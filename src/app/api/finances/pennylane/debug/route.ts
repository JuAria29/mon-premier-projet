import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

const PL_BASE = "https://app.pennylane.com/api/external/v1";
const USER_ID = "julien";

export async function GET() {
  // 1. Check token source
  let token: string | null = null;
  let tokenSource = "none";

  try {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("user_integrations")
      .select("api_token")
      .eq("user_id", USER_ID)
      .eq("service", "pennylane")
      .single();
    if (data?.api_token) { token = data.api_token; tokenSource = "supabase"; }
  } catch (e) {
    // ignore
  }

  if (!token && process.env.PENNYLANE_API_TOKEN) {
    token = process.env.PENNYLANE_API_TOKEN;
    tokenSource = "env";
  }

  if (!token) {
    return NextResponse.json({ error: "Aucun token trouvé", tokenSource });
  }

  const results: Record<string, unknown> = { tokenSource, tokenLength: token.length, tokenPrefix: token.slice(0, 8) + "…" };

  // 2. Test raw API calls
  const endpoints = [
    "/customer_invoices?per_page=3",
    "/supplier_invoices?per_page=3",
    "/customer_invoices?per_page=3&filter[date][gteq]=2025-10-01&filter[date][lteq]=2026-09-30",
    "/customer_invoices?per_page=3&filter[date][gt]=2025-10-01&filter[date][lt]=2026-09-30",
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${PL_BASE}${ep}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        results[ep] = { status: res.status, body: await res.text().catch(() => "") };
      } else {
        const json = await res.json() as Record<string, unknown>;
        const keys = Object.keys(json);
        const first = keys[0];
        const items = Array.isArray(json[first]) ? (json[first] as unknown[]).slice(0, 1) : json[first];
        results[ep] = { status: 200, rootKeys: keys, firstItem: items, meta: json.meta };
      }
    } catch (e) {
      results[ep] = { error: String(e) };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
