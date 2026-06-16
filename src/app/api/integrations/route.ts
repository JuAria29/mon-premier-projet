import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

// For multi-user SaaS: replace with session-based user ID from auth
const USER_ID = "julien";

export async function GET(req: NextRequest) {
  const service = new URL(req.url).searchParams.get("service");
  const supabase = createSupabaseServiceClient();

  if (service) {
    const { data } = await supabase
      .from("user_integrations")
      .select("api_token, config, is_active, updated_at")
      .eq("user_id", USER_ID)
      .eq("service", service)
      .single();

    if (!data?.api_token) return NextResponse.json({ configured: false });

    const masked = `••••••••${data.api_token.slice(-4)}`;
    return NextResponse.json({
      configured: true,
      masked,
      updated_at: data.updated_at,
    });
  }

  const { data } = await supabase
    .from("user_integrations")
    .select("service, is_active, updated_at")
    .eq("user_id", USER_ID);

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { service, api_token, config } = body;
    if (!service || !api_token) {
      return NextResponse.json({ error: "service et api_token requis" }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("user_integrations").upsert({
      user_id: USER_ID,
      service,
      api_token,
      config: config ?? null,
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const service = new URL(req.url).searchParams.get("service");
  if (!service) return NextResponse.json({ error: "service requis" }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("user_integrations")
    .delete()
    .eq("user_id", USER_ID)
    .eq("service", service);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
