"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import type { ModuleId, PermissionLevel } from "@/lib/permissions";

const MODULES: { id: ModuleId; label: string; icon: string }[] = [
  { id: "dashboard",  label: "Dashboard & Coach IA",       icon: "🏠" },
  { id: "finances",   label: "Finances",                   icon: "📊" },
  { id: "commercial", label: "Commercial & Devis",         icon: "💼" },
  { id: "planning",   label: "Planning & Interventions",   icon: "📅" },
  { id: "clients",    label: "Clients & Contacts",         icon: "👥" },
  { id: "mails",      label: "Mails & Notes",              icon: "📧" },
  { id: "objectifs",  label: "Objectifs",                  icon: "🎯" },
  { id: "export",     label: "Export de données",          icon: "⬇️" },
  { id: "admin",      label: "Gestion utilisateurs",       icon: "⚙️" },
];

const LEVELS: { value: PermissionLevel; label: string; color: string; bg: string }[] = [
  { value: "full",  label: "Complet",     color: "#8a4620", bg: "#f5ede6" },
  { value: "write", label: "Écriture",    color: "#0d9488", bg: "#e3f5f4" },
  { value: "read",  label: "Lecture",     color: "#2563eb", bg: "#dbeafe" },
  { value: "own",   label: "Ses données", color: "#16a34a", bg: "#e6f4ed" },
  { value: "none",  label: "—",           color: "#9ca3af", bg: "#f3f4f6" },
];

interface Role {
  id: string;
  name: string;
  slug: string;
  color: string;
  is_system: boolean;
  permissions: Record<ModuleId, PermissionLevel>;
}

export default function AdminRolesPage() {
  const router = useRouter();
  const { isDirigeant, loading: permLoading } = usePermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!permLoading && !isDirigeant) router.replace("/");
  }, [permLoading, isDirigeant, router]);

  useEffect(() => {
    fetch("/api/admin/roles")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Role[]) => {
        setRoles(data);
        if (data.length > 0) setSelectedRole(data[0]);
      })
      .catch(() => {});
  }, []);

  function setLevel(module: ModuleId, level: PermissionLevel) {
    if (!selectedRole) return;
    setSelectedRole({
      ...selectedRole,
      permissions: { ...selectedRole.permissions, [module]: level },
    });
    setSaved(false);
  }

  async function handleSave() {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_id: selectedRole.id, permissions: selectedRole.permissions }),
      });
      if (res.ok) {
        setSaved(true);
        setRoles((prev) => prev.map((r) => (r.id === selectedRole.id ? selectedRole : r)));
      }
    } finally {
      setSaving(false);
    }
  }

  if (permLoading) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ maxWidth: 1000, margin: "0 auto 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={() => router.back()}
          style={{ padding: "7px 14px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: 13, cursor: "pointer", color: "var(--text-soft)" }}
        >
          ← Retour
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Gestion des rôles</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            Définissez les permissions de chaque rôle module par module
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start" }}>
        {/* Liste des rôles */}
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow)" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)" }}>
            Rôles actifs
          </div>
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => { setSelectedRole(role); setSaved(false); }}
              style={{
                width: "100%", textAlign: "left",
                padding: "11px 16px", fontSize: 13, fontWeight: selectedRole?.id === role.id ? 700 : 500,
                background: selectedRole?.id === role.id ? "var(--accent-soft)" : "transparent",
                color: selectedRole?.id === role.id ? "var(--accent)" : "var(--text-soft)",
                border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: role.color, flexShrink: 0, display: "inline-block" }} />
              {role.name}
              {role.is_system && (
                <span style={{ marginLeft: "auto", fontSize: 9, background: "var(--surface2)", padding: "1px 6px", borderRadius: 5, color: "var(--text-muted)", fontWeight: 600 }}>
                  Système
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Éditeur de permissions */}
        {selectedRole && (
          <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow)" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedRole.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Cliquez sur un niveau pour modifier
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving || selectedRole.slug === "dirigeant"}
                style={{
                  padding: "8px 18px", borderRadius: 10, border: "none", cursor: selectedRole.slug === "dirigeant" ? "not-allowed" : "pointer",
                  background: saved ? "#e6f4ed" : "var(--accent)", color: saved ? "#16a34a" : "white",
                  fontSize: 13, fontWeight: 700, opacity: selectedRole.slug === "dirigeant" ? 0.4 : 1,
                }}
              >
                {saving ? "Sauvegarde…" : saved ? "✓ Sauvegardé" : "Sauvegarder"}
              </button>
            </div>
            {selectedRole.slug === "dirigeant" && (
              <div style={{ margin: "12px 24px", padding: "10px 14px", borderRadius: 10, background: "var(--accent-soft)", fontSize: 12, color: "var(--accent-strong)" }}>
                Le rôle Dirigeant a toujours accès à tout — ses permissions ne sont pas modifiables.
              </div>
            )}
            <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
              {MODULES.map((mod) => {
                const current = selectedRole.permissions[mod.id] ?? "none";
                return (
                  <div key={mod.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 11, background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 15 }}>{mod.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, width: 200, flexShrink: 0 }}>{mod.label}</span>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {LEVELS.map((lvl) => (
                        <button
                          key={lvl.value}
                          disabled={selectedRole.slug === "dirigeant"}
                          onClick={() => setLevel(mod.id, lvl.value)}
                          style={{
                            padding: "3px 11px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                            cursor: selectedRole.slug === "dirigeant" ? "default" : "pointer",
                            border: current === lvl.value ? `1.5px solid ${lvl.color}` : "1.5px solid transparent",
                            background: current === lvl.value ? lvl.bg : "var(--surface)",
                            color: current === lvl.value ? lvl.color : "var(--text-muted)",
                          }}
                        >
                          {lvl.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
