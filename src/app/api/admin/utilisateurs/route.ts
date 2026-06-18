import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

// GET — liste tous les utilisateurs avec leur rôle
export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from("user_profiles")
      .select(`
        id, full_name, email, created_at,
        role:roles ( id, name, slug, color )
      `)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Récupérer le statut de confirmation depuis auth.users via admin API
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const authMap = new Map((authUsers?.users ?? []).map((u) => [u.id, u]));

    const result = (data ?? []).map((p) => {
      const authUser = authMap.get(p.id);
      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        role: p.role,
        created_at: p.created_at,
        confirmed: authUser?.email_confirmed_at != null,
        last_sign_in: authUser?.last_sign_in_at ?? null,
      };
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST — inviter un nouvel utilisateur
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const body: { email: string; full_name: string; role_id: string } = await req.json();

    if (!body.email || !body.role_id) {
      return NextResponse.json({ error: "email et role_id requis" }, { status: 400 });
    }

    // Vérifier que le rôle existe
    const { data: role } = await supabase
      .from("roles")
      .select("id, name")
      .eq("id", body.role_id)
      .single();

    if (!role) return NextResponse.json({ error: "Rôle introuvable" }, { status: 404 });

    // Envoyer l'invitation via Supabase Auth
    const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      body.email,
      {
        data: {
          full_name: body.full_name || body.email.split("@")[0],
          role_id: body.role_id,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"}/auth/accept`,
      }
    );

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, user_id: invited.user.id });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE — supprimer un utilisateur
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const { user_id } = await req.json();

    if (!user_id) return NextResponse.json({ error: "user_id requis" }, { status: 400 });

    const { error } = await supabase.auth.admin.deleteUser(user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
