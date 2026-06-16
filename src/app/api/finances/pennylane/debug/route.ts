import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

const USER_ID = "julien";

export async function GET() {
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
  } catch { /* ignore */ }

  if (!token && process.env.PENNYLANE_API_TOKEN) {
    token = process.env.PENNYLANE_API_TOKEN;
    tokenSource = "env";
  }

  if (!token) return NextResponse.json({ error: "Aucun token", tokenSource });

  const results: Record<string, unknown> = {
    tokenSource, tokenLength: token.length, tokenPrefix: token.slice(0, 8) + "…",
  };

  const endpoints = [
    "https://app.pennylane.com/api/external/v1/customer_invoices?per_page=2",
    "https://app.pennylane.com/api/external/v2/customer_invoices?per_page=2",
    "https://app.pennylane.com/api/external/v2/customer_invoices?per_page=2&filter[date][gteq]=2025-10-01&filter[date][lteq]=2026-09-30",
  ];

  for (const url of endpoints) {
    const key = url.replace("https://app.pennylane.com/api/external/", "");
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        results[key] = { status: res.status, body: await res.text().catch(() => "") };
      } else {
        const json = await res.json() as Record<string, unknown>;
        const rootKeys = Object.keys(json);
        const firstKey = rootKeys.find(k => Array.isArray(json[k]));
        const items = firstKey ? (json[firstKey] as unknown[]).slice(0, 1) : null;
        results[key] = { status: 200, rootKeys, firstItem: items?.[0], meta: json.meta };
      }
    } catch (e) {
      results[key] = { error: String(e) };
    }
  }

  return NextResponse.json(results);
}
