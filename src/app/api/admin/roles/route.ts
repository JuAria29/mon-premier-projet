import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import type { ModuleId, PermissionLevel } from "@/lib/permissions";

// GET — liste tous les rôles avec leurs permissions
export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();

    const { data: roles, error } = await supabase
      .from("roles")
      .select(`id, name, slug, color, is_system, role_permissions ( module_id, level )`)
      .order("name");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const result = (roles ?? []).map((r) => {
      const permissions: Record<string, PermissionLevel> = {};
      for (const p of r.role_permissions ?? []) {
        permissions[p.module_id] = p.level as PermissionLevel;
      }
      return { id: r.id, name: r.name, slug: r.slug, color: r.color, is_system: r.is_system, permissions };
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// PUT — met à jour les permissions d'un rôle
export async function PUT(req: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const body: { role_id: string; permissions: Record<ModuleId, PermissionLevel> } = await req.json();

    if (!body.role_id || !body.permissions) {
      return NextResponse.json({ error: "role_id and permissions required" }, { status: 400 });
    }

    // Vérifier que ce n'est pas le rôle dirigeant
    const { data: role } = await supabase
      .from("roles")
      .select("slug")
      .eq("id", body.role_id)
      .single();

    if (role?.slug === "dirigeant") {
      return NextResponse.json({ error: "Le rôle Dirigeant ne peut pas être modifié" }, { status: 403 });
    }

    // Supprimer les anciennes permissions et réinsérer
    await supabase.from("role_permissions").delete().eq("role_id", body.role_id);

    const inserts = Object.entries(body.permissions).map(([module_id, level]) => ({
      role_id: body.role_id,
      module_id,
      level,
    }));

    const { error } = await supabase.from("role_permissions").insert(inserts);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
