import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const exerciseStart = searchParams.get("exercise_start") || "2025-10-01";

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("interfast_stats_cache")
    .select("*")
    .eq("exercise_start", exerciseStart)
    .single();

  if (error) return NextResponse.json({ stats: null });
  return NextResponse.json({ stats: data });
}
