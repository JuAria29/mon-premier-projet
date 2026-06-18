import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { DIRIGEANT_PERMISSIONS } from "@/lib/permissions";
import type { ModuleId, PermissionLevel } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();

    // Récupère l'utilisateur via le cookie de session Supabase
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    let userId: string | null = null;

    if (token) {
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    // Fallback : si pas de session, retourne le profil dirigeant par défaut
    // (phase transitoire — à supprimer une fois l'auth multi-user activée)
    if (!userId) {
      return NextResponse.json({
        id: "local",
        full_name: "Julien Pasini",
        email: "julien.pasini@aria-energies.fr",
        role: { id: "system", name: "Dirigeant", slug: "dirigeant", color: "#b5612f", is_system: true },
        permissions: DIRIGEANT_PERMISSIONS,
      });
    }

    // Charger le profil + rôle + permissions
    const { data: profile } = await supabase
      .from("user_profiles")
      .select(`
        id, full_name, email,
        role:roles (
          id, name, slug, color, is_system,
          role_permissions ( module_id, level )
        )
      `)
      .eq("id", userId)
      .single();

    if (!profile || !profile.role) {
      // Utilisateur sans profil → accès minimal
      return NextResponse.json({
        id: userId,
        full_name: null,
        email: null,
        role: null,
        permissions: {} as Record<ModuleId, PermissionLevel>,
      });
    }

    // Construire la map permissions
    const permissions: Record<string, PermissionLevel> = {};
    for (const perm of (profile.role as any).role_permissions ?? []) {
      permissions[perm.module_id] = perm.level;
    }

    return NextResponse.json({
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: {
        id: (profile.role as any).id,
        name: (profile.role as any).name,
        slug: (profile.role as any).slug,
        color: (profile.role as any).color,
        is_system: (profile.role as any).is_system,
      },
      permissions,
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
