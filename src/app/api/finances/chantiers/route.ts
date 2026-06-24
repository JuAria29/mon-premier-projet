import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const statuts = searchParams.get("statuts")?.split(",").filter(Boolean) ?? [];
    const q = searchParams.get("q") ?? "";
    const page = Math.max(0, parseInt(searchParams.get("page") ?? "0"));
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 200);
    const from = page * limit;
    const to = from + limit - 1;

    const supabase = createSupabaseServiceClient();

    let query = supabase
      .from("interfast_chantiers_cache")
      .select("*", { count: "exact" })
      .order("date_debut", { ascending: false });

    if (statuts.length > 0) query = query.in("statut", statuts);
    if (q.trim()) {
      query = query.or(
        `titre.ilike.%${q}%,client.ilike.%${q}%,reference.ilike.%${q}%,adresse.ilike.%${q}%`
      );
    }
    query = query.range(from, to);

    const { data: chantiers, count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Summary par statut
    const { data: allRows } = await supabase
      .from("interfast_chantiers_cache")
      .select("statut");

    const summary: Record<string, number> = {};
    for (const row of allRows ?? []) {
      summary[row.statut] = (summary[row.statut] ?? 0) + 1;
    }
    const total = allRows?.length ?? 0;

    return NextResponse.json({ chantiers, count, page, limit, summary, total });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
