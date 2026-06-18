"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";

interface Role {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface UserEntry {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role | null;
  created_at: string;
  confirmed: boolean;
  last_sign_in: string | null;
}

function timeAgo(iso: string | null) {
  if (!iso) return "jamais";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function AdminUtilisateursPage() {
  const router = useRouter();
  const { isDirigeant, loading: permLoading } = usePermissions();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", role_id: "" });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!permLoading && !isDirigeant) router.replace("/");
  }, [permLoading, isDirigeant, router]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/utilisateurs").then((r) => r.ok ? r.json() : []),
      fetch("/api/admin/roles").then((r) => r.ok ? r.json() : []),
    ]).then(([u, r]) => {
      setUsers(u);
      setRoles(r.filter((role: Role) => role.slug !== "dirigeant"));
    }).finally(() => setLoading(false));
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.role_id) return;
    setInviting(true);
    setInviteError(null);
    try {
      const res = await fetch("/api/admin/utilisateurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setInviteError(data.error); return; }
      setInviteSent(true);
      setForm({ email: "", full_name: "", role_id: "" });
      setTimeout(() => {
        setInviteSent(false);
        setShowInvite(false);
        fetch("/api/admin/utilisateurs").then((r) => r.json()).then(setUsers);
      }, 2500);
    } finally {
      setInviting(false);
    }
  }

  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`Supprimer l'accès de "${userName}" ? Cette action est irréversible.`)) return;
    setDeletingId(userId);
    try {
      await fetch("/api/admin/utilisateurs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } finally {
      setDeletingId(null);
    }
  }

  if (permLoading || loading) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 24px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => router.back()}
            style={{ padding: "7px 14px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: 13, cursor: "pointer", color: "var(--text-soft)" }}
          >
            ← Retour
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Utilisateurs</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              {users.length} membre{users.length > 1 ? "s" : ""} · Invitez des collaborateurs et assignez-leur un rôle
            </p>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            style={{ padding: "9px 20px", borderRadius: 11, background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}
          >
            + Inviter
          </button>
        </div>

        {/* Liste utilisateurs */}
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow)" }}>
          {users.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Aucun collaborateur invité pour l'instant.
            </div>
          ) : (
            users.map((user, i) => (
              <div
                key={user.id}
                style={{
                  display: "flex", alignItems: "center", gap: 16, padding: "16px 24px",
                  borderBottom: i < users.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                  background: user.role?.color ?? "var(--border)",
                  color: "#fff", fontWeight: 700, fontSize: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {(user.full_name ?? user.email ?? "?").charAt(0).toUpperCase()}
                </div>

                {/* Infos */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>
                    {user.full_name ?? user.email}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                    {user.email}
                  </div>
                </div>

                {/* Rôle */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {user.role ? (
                    <span style={{
                      padding: "3px 11px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: `${user.role.color}18`, color: user.role.color,
                    }}>
                      {user.role.name}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Sans rôle</span>
                  )}
                </div>

                {/* Statut */}
                <div style={{ textAlign: "right", minWidth: 90 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: user.confirmed ? "var(--green, #16a34a)" : "var(--text-muted)" }}>
                    {user.confirmed ? "✓ Actif" : "⏳ En attente"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                    Connecté {timeAgo(user.last_sign_in)}
                  </div>
                </div>

                {/* Supprimer */}
                {user.role?.slug !== "dirigeant" && (
                  <button
                    onClick={() => handleDelete(user.id, user.full_name ?? user.email ?? user.id)}
                    disabled={deletingId === user.id}
                    style={{
                      padding: "5px 10px", borderRadius: 7, border: "1.5px solid var(--border)",
                      background: "transparent", fontSize: 11, color: "var(--text-muted)",
                      cursor: "pointer", flexShrink: 0,
                    }}
                  >
                    {deletingId === user.id ? "…" : "Retirer"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>

      </div>

      {/* Modal invitation */}
      {showInvite && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowInvite(false); }}
        >
          <div style={{ background: "var(--surface)", borderRadius: 20, padding: "32px 28px", width: "100%", maxWidth: 440, boxShadow: "0 8px 40px rgba(40,30,20,0.18)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Inviter un collaborateur</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
              Il recevra un email avec un lien pour définir son mot de passe.
            </p>

            {inviteSent ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>✉️</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Invitation envoyée !</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Fermeture automatique…</div>
              </div>
            ) : (
              <form onSubmit={handleInvite} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="prenom.nom@entreprise.fr"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 13, fontFamily: "inherit", background: "var(--surface2)", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                    Prénom Nom
                  </label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                    placeholder="Thomas Dupont"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 13, fontFamily: "inherit", background: "var(--surface2)", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                    Rôle *
                  </label>
                  <select
                    required
                    value={form.role_id}
                    onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 13, fontFamily: "inherit", background: "var(--surface2)", outline: "none", cursor: "pointer" }}
                  >
                    <option value="">Choisir un rôle…</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {inviteError && (
                  <p style={{ fontSize: 12, color: "#dc2626", background: "#fef2f2", padding: "8px 12px", borderRadius: 8 }}>
                    {inviteError}
                  </p>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setShowInvite(false)}
                    style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1.5px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--text-soft)" }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    style={{ flex: 2, padding: "10px", borderRadius: 10, background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", opacity: inviting ? 0.7 : 1 }}
                  >
                    {inviting ? "Envoi…" : "Envoyer l'invitation"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
