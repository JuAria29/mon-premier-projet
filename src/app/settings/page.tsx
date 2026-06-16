"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icons";
import type { AppSettings, Layout, Density } from "@/types";

type Ton = "direct" | "chaleureux" | "exigeant";
type ConnectStatus = "loading" | "connected" | "unknown" | "error";

// ─── Brand logos ─────────────────────────────────────────────────────────────

function MicrosoftLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 21 21" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function PennylaneLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#18A999" />
      <text x="5" y="17" fontFamily="Arial" fontSize="14" fontWeight="700" fill="white">P</text>
    </svg>
  );
}

function InterfastLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#1e40af" />
      <text x="5" y="17" fontFamily="Arial" fontSize="12" fontWeight="700" fill="white">IF</text>
    </svg>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: "0 0 14px",
      fontSize: 10,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: "var(--text-muted)",
    }}>
      {children}
    </p>
  );
}

function RadioOption<T extends string>({
  option,
  selected,
  onSelect,
}: {
  option: { id: T; label: string; desc: string };
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "11px 14px",
        borderRadius: 10,
        border: `1.5px solid ${selected ? "var(--accent)" : "var(--border)"}`,
        background: selected ? "var(--accent-soft)" : "var(--surface)",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.12s",
        width: "100%",
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: "50%",
        border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`,
        background: selected ? "var(--accent)" : "transparent",
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {selected && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />}
      </div>
      <div>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{option.label}</p>
        <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>{option.desc}</p>
      </div>
    </button>
  );
}

// ─── Connection cards ─────────────────────────────────────────────────────────

function OAuthCard({
  label,
  description,
  status,
  disconnecting,
  onConnect,
  onDisconnect,
  logo,
  logoBg,
}: {
  label: string;
  description: string;
  status: ConnectStatus;
  disconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  logo: React.ReactNode;
  logoBg: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "13px 14px", borderRadius: 10,
      border: "1px solid var(--border)", background: "var(--surface)",
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 8, background: logoBg,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {logo}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{label}</p>
        <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>{description}</p>
      </div>
      {status === "loading" ? (
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>…</span>
      ) : status === "connected" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: "oklch(0.55 0.085 155)",
            padding: "3px 9px", borderRadius: 999,
            background: "oklch(0.55 0.085 155 / 12%)",
          }}>✓ Connecté</span>
          <button className="btn-ghost" onClick={onDisconnect} disabled={disconnecting}
            style={{ fontSize: 12, padding: "5px 10px" }}>
            {disconnecting ? "…" : "Déconnecter"}
          </button>
        </div>
      ) : (
        <button className="btn-primary" onClick={onConnect}
          style={{ fontSize: 12, padding: "7px 14px" }}>
          Connecter
        </button>
      )}
    </div>
  );
}

function ApiTokenCard({
  label,
  description,
  logo,
  logoBg,
  configured,
  masked,
  updatedAt,
  loading,
  onSave,
  onDelete,
}: {
  label: string;
  description: string;
  logo: React.ReactNode;
  logoBg: string;
  configured: boolean;
  masked: string | null;
  updatedAt: string | null;
  loading: boolean;
  onSave: (token: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    if (!input.trim()) return;
    setSaving(true);
    try {
      await onSave(input.trim());
      setInput("");
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer la configuration ${label} ?`)) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{
      padding: "13px 14px", borderRadius: 10,
      border: "1px solid var(--border)", background: "var(--surface)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, background: logoBg,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {logo}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{label}</p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>{description}</p>
        </div>
        {loading ? (
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>…</span>
        ) : configured ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: "oklch(0.55 0.085 155)",
              padding: "3px 9px", borderRadius: 999,
              background: "oklch(0.55 0.085 155 / 12%)",
            }}>✓ Configuré</span>
            <button className="btn-ghost" onClick={() => setEditing((v) => !v)}
              style={{ fontSize: 12, padding: "5px 10px" }}>Modifier</button>
            <button className="btn-ghost" onClick={handleDelete} disabled={deleting}
              style={{ fontSize: 12, padding: "5px 10px", color: "var(--accent)" }}>
              {deleting ? "…" : "Supprimer"}
            </button>
          </div>
        ) : (
          <button className="btn-primary" onClick={() => setEditing(true)}
            style={{ fontSize: 12, padding: "7px 14px" }}>
            Configurer
          </button>
        )}
      </div>

      {configured && masked && !editing && (
        <div style={{ marginTop: 8, marginLeft: 48 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{masked}</span>
          {updatedAt && (
            <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 8 }}>
              — configuré le {new Date(updatedAt).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>
      )}

      {editing && (
        <div style={{ marginTop: 10, marginLeft: 48, display: "flex", gap: 8 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Coller le token API ici…"
            autoFocus
            style={{
              flex: 1, padding: "7px 10px",
              border: "1px solid var(--border)", borderRadius: 8,
              fontSize: 12, background: "var(--bg)", color: "var(--text)",
              fontFamily: "monospace",
            }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
          />
          <button className="btn-primary" onClick={handleSave} disabled={saving || !input.trim()}
            style={{ fontSize: 12, padding: "7px 14px", flexShrink: 0 }}>
            {saving ? "…" : "Enregistrer"}
          </button>
          <button className="btn-ghost" onClick={() => setEditing(false)}
            style={{ fontSize: 12, padding: "7px 10px", flexShrink: 0 }}>
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}

function StatusCard({
  label,
  description,
  logo,
  logoBg,
  badge,
  badgeColor,
  note,
}: {
  label: string;
  description: string;
  logo: React.ReactNode;
  logoBg: string;
  badge: string;
  badgeColor: string;
  note?: string;
}) {
  return (
    <div style={{
      padding: "13px 14px", borderRadius: 10,
      border: "1px solid var(--border)", background: "var(--surface)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, background: logoBg,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {logo}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{label}</p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>{description}</p>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "3px 9px",
          borderRadius: 999, background: `${badgeColor}20`, color: badgeColor,
        }}>
          {badge}
        </span>
      </div>
      {note && (
        <p style={{ margin: "8px 0 0 48px", fontSize: 11, color: "var(--text-muted)" }}>{note}</p>
      )}
    </div>
  );
}

// ─── Options ─────────────────────────────────────────────────────────────────

const tonOptions: { id: Ton; label: string; desc: string }[] = [
  { id: "direct", label: "Direct", desc: "Concis, factuel, orienté action" },
  { id: "chaleureux", label: "Chaleureux", desc: "Empathique, encourageant, bienveillant" },
  { id: "exigeant", label: "Exigeant", desc: "Ambitieux, sans complaisance, orienté résultat" },
];

const layoutOptions: { id: Layout; label: string; desc: string }[] = [
  { id: "equilibre", label: "Équilibre", desc: "Coach + tâches en colonnes, vue complète" },
  { id: "focus", label: "Focus", desc: "Colonne unique, concentration maximale" },
  { id: "dense", label: "Dense", desc: "Deux colonnes chargées, vue synthétique" },
];

const densityOptions: { id: Density; label: string; desc: string }[] = [
  { id: "compact", label: "Compact", desc: "Espacement réduit, plus d'infos à l'écran" },
  { id: "regular", label: "Regular", desc: "Espacement équilibré (défaut)" },
  { id: "comfy", label: "Comfy", desc: "Espacement généreux, lecture confortable" },
];

const WORKSPACE_COLORS = [
  { label: "Terracotta", value: "#b5612f" },
  { label: "Bleu marine", value: "#2563eb" },
  { label: "Vert forêt", value: "#16a34a" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Bordeaux", value: "#9f1239" },
  { label: "Teal", value: "#0d9488" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Preferences
  const [ton, setTon] = useState<Ton>("direct");
  const [layout, setLayout] = useState<Layout>("equilibre");
  const [density, setDensity] = useState<Density>("regular");
  const [colorPro, setColorPro] = useState("#b5612f");
  const [colorPerso, setColorPerso] = useState("#2563eb");
  const [saved, setSaved] = useState(false);

  // Microsoft OAuth
  const [msStatusPro, setMsStatusPro] = useState<ConnectStatus>("loading");
  const [msStatusPerso, setMsStatusPerso] = useState<ConnectStatus>("loading");
  const [disconnectingMsPro, setDisconnectingMsPro] = useState(false);
  const [disconnectingMsPerso, setDisconnectingMsPerso] = useState(false);

  // Google OAuth
  const [gStatusPro, setGStatusPro] = useState<ConnectStatus>("loading");
  const [gStatusPerso, setGStatusPerso] = useState<ConnectStatus>("loading");
  const [disconnectingGPro, setDisconnectingGPro] = useState(false);
  const [disconnectingGPerso, setDisconnectingGPerso] = useState(false);

  // API tokens (Pennylane, etc.)
  const [plConfigured, setPlConfigured] = useState(false);
  const [plMasked, setPlMasked] = useState<string | null>(null);
  const [plUpdatedAt, setPlUpdatedAt] = useState<string | null>(null);
  const [plLoading, setPlLoading] = useState(true);

  const loadPrefs = useCallback(() => {
    try {
      const s = localStorage.getItem("aria-settings");
      if (s) {
        const p: AppSettings = JSON.parse(s);
        if (p.ton) setTon(p.ton);
        if (p.layout) setLayout(p.layout);
        if (p.density) setDensity(p.density);
      }
      const colors = localStorage.getItem("aria-workspace-colors");
      if (colors) {
        const c = JSON.parse(colors);
        if (c.pro) setColorPro(c.pro);
        if (c.perso) setColorPerso(c.perso);
      }
    } catch { /* ignore */ }
  }, []);

  const checkOAuth = useCallback(async () => {
    const check = async (provider: "microsoft" | "google", workspace: "pro" | "perso") => {
      const setter = provider === "microsoft"
        ? (workspace === "pro" ? setMsStatusPro : setMsStatusPerso)
        : (workspace === "pro" ? setGStatusPro : setGStatusPerso);
      try {
        const r = await fetch(`/api/${provider}/status?workspace=${workspace}`);
        const { connected } = await r.json();
        setter(connected ? "connected" : "unknown");
      } catch {
        setter("unknown");
      }
    };
    await Promise.all([
      check("microsoft", "pro"),
      check("microsoft", "perso"),
      check("google", "pro"),
      check("google", "perso"),
    ]);
  }, []);

  const checkPennylane = useCallback(async () => {
    setPlLoading(true);
    try {
      const r = await fetch("/api/integrations?service=pennylane");
      const data = await r.json();
      setPlConfigured(data.configured ?? false);
      setPlMasked(data.masked ?? null);
      setPlUpdatedAt(data.updated_at ?? null);
    } finally {
      setPlLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrefs();

    // Handle OAuth callbacks
    const ms = searchParams.get("ms");
    const google = searchParams.get("google");
    const ws = searchParams.get("workspace") || "pro";
    if (ms === "connected") ws === "perso" ? setMsStatusPerso("connected") : setMsStatusPro("connected");
    else if (ms === "error") ws === "perso" ? setMsStatusPerso("error") : setMsStatusPro("error");
    if (google === "connected") ws === "perso" ? setGStatusPerso("connected") : setGStatusPro("connected");
    else if (google === "error") ws === "perso" ? setGStatusPerso("error") : setGStatusPro("error");

    checkOAuth();
    checkPennylane();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Microsoft handlers
  async function disconnectMs(workspace: "pro" | "perso") {
    if (!confirm(`Déconnecter Microsoft ${workspace === "pro" ? "Pro" : "Perso"} ?`)) return;
    const setSaving = workspace === "pro" ? setDisconnectingMsPro : setDisconnectingMsPerso;
    const setStatus = workspace === "pro" ? setMsStatusPro : setMsStatusPerso;
    setSaving(true);
    try {
      const r = await fetch(`/api/microsoft/disconnect?workspace=${workspace}`, { method: "POST" });
      if (r.ok) setStatus("unknown");
    } finally { setSaving(false); }
  }

  // Google handlers
  async function disconnectGoogle(workspace: "pro" | "perso") {
    if (!confirm(`Déconnecter Google ${workspace === "pro" ? "Pro" : "Perso"} ?`)) return;
    const setSaving = workspace === "pro" ? setDisconnectingGPro : setDisconnectingGPerso;
    const setStatus = workspace === "pro" ? setGStatusPro : setGStatusPerso;
    setSaving(true);
    try {
      const r = await fetch(`/api/google/disconnect?workspace=${workspace}`, { method: "POST" });
      if (r.ok) setStatus("unknown");
    } finally { setSaving(false); }
  }

  // Pennylane handlers
  async function savePennylaneToken(token: string) {
    await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service: "pennylane", api_token: token }),
    });
    await checkPennylane();
  }

  async function deletePennylaneToken() {
    await fetch("/api/integrations?service=pennylane", { method: "DELETE" });
    setPlConfigured(false);
    setPlMasked(null);
    setPlUpdatedAt(null);
  }

  function save() {
    localStorage.setItem("aria-settings", JSON.stringify({ ton, layout, density }));
    localStorage.setItem("aria-workspace-colors", JSON.stringify({ pro: colorPro, perso: colorPerso }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "28px 24px 48px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <button onClick={() => router.push("/")} className="btn-ghost"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px" }}>
            <Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }} />
            Retour
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0 }}>Paramètres</h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Comptes, intégrations et préférences</p>
          </div>
        </div>

        {/* ── Comptes & Intégrations ─────────────────────────────────────── */}
        <div className="card" style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <SectionTitle>Microsoft 365</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <OAuthCard
                label="Espace Pro"
                description={msStatusPro === "connected" ? "Outlook · To Do · OneNote · Calendrier" : "Non connecté"}
                status={msStatusPro}
                disconnecting={disconnectingMsPro}
                onConnect={() => window.location.href = "/api/microsoft/connect?workspace=pro"}
                onDisconnect={() => disconnectMs("pro")}
                logo={<MicrosoftLogo size={20} />}
                logoBg="#0078d4"
              />
              <OAuthCard
                label="Espace Perso"
                description={msStatusPerso === "connected" ? "Outlook · To Do · OneNote · Calendrier" : "Non connecté"}
                status={msStatusPerso}
                disconnecting={disconnectingMsPerso}
                onConnect={() => window.location.href = "/api/microsoft/connect?workspace=perso"}
                onDisconnect={() => disconnectMs("perso")}
                logo={<MicrosoftLogo size={20} />}
                logoBg="#0078d4"
              />
            </div>
            {(msStatusPro === "error" || msStatusPerso === "error") && (
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--accent)" }}>
                Connexion échouée — vérifiez vos paramètres Azure AD.
              </p>
            )}
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
            <SectionTitle>Google</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <OAuthCard
                label="Espace Pro"
                description={gStatusPro === "connected" ? "Gmail · Google Agenda · Google Tasks" : "Non connecté"}
                status={gStatusPro}
                disconnecting={disconnectingGPro}
                onConnect={() => window.location.href = "/api/google/connect?workspace=pro"}
                onDisconnect={() => disconnectGoogle("pro")}
                logo={<GoogleLogo size={20} />}
                logoBg="#fff"
              />
              <OAuthCard
                label="Espace Perso"
                description={gStatusPerso === "connected" ? "Gmail · Google Agenda · Google Tasks" : "Non connecté"}
                status={gStatusPerso}
                disconnecting={disconnectingGPerso}
                onConnect={() => window.location.href = "/api/google/connect?workspace=perso"}
                onDisconnect={() => disconnectGoogle("perso")}
                logo={<GoogleLogo size={20} />}
                logoBg="#fff"
              />
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
            <SectionTitle>Intégrations métier</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ApiTokenCard
                label="Pennylane"
                description="Comptabilité · Factures clients · Fournisseurs"
                logo={<PennylaneLogo size={20} />}
                logoBg="#18A999"
                configured={plConfigured}
                masked={plMasked}
                updatedAt={plUpdatedAt}
                loading={plLoading}
                onSave={savePennylaneToken}
                onDelete={deletePennylaneToken}
              />
              <StatusCard
                label="Interfast"
                description="Devis · Interventions · Chantiers · Facturation"
                logo={<InterfastLogo size={20} />}
                logoBg="#1e40af"
                badge="✓ Actif"
                badgeColor="oklch(0.55 0.085 155)"
                note="Connecté via MCP — données synchronisées à la demande depuis Aria Coach."
              />
            </div>
          </div>
        </div>

        {/* ── Ton du coach ──────────────────────────────────────────────── */}
        <div className="card" style={{ padding: "20px 20px" }}>
          <SectionTitle>Ton du coach</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {tonOptions.map((opt) => (
              <RadioOption key={opt.id} option={opt} selected={ton === opt.id} onSelect={() => setTon(opt.id)} />
            ))}
          </div>
        </div>

        {/* ── Disposition du dashboard ──────────────────────────────────── */}
        <div className="card" style={{ padding: "20px 20px" }}>
          <SectionTitle>Disposition du dashboard</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {layoutOptions.map((opt) => (
              <RadioOption key={opt.id} option={opt} selected={layout === opt.id} onSelect={() => setLayout(opt.id)} />
            ))}
          </div>
        </div>

        {/* ── Densité ───────────────────────────────────────────────────── */}
        <div className="card" style={{ padding: "20px 20px" }}>
          <SectionTitle>Densité de l&apos;interface</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {densityOptions.map((opt) => (
              <RadioOption key={opt.id} option={opt} selected={density === opt.id} onSelect={() => setDensity(opt.id)} />
            ))}
          </div>
        </div>

        {/* ── Couleurs ──────────────────────────────────────────────────── */}
        <div className="card" style={{ padding: "20px 20px" }}>
          <SectionTitle>Couleurs des espaces</SectionTitle>
          {([
            { label: "Espace Pro", value: colorPro, setter: setColorPro },
            { label: "Espace Perso", value: colorPerso, setter: setColorPerso },
          ] as const).map(({ label, value, setter }) => (
            <div key={label} style={{ marginBottom: 16 }}>
              <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{label}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {WORKSPACE_COLORS.map((c) => (
                  <button key={c.value} title={c.label} onClick={() => setter(c.value)} style={{
                    width: 26, height: 26, borderRadius: "50%", background: c.value, border: "none",
                    cursor: "pointer", flexShrink: 0,
                    outline: value === c.value ? `3px solid ${c.value}` : "none",
                    outlineOffset: 2,
                    boxShadow: value === c.value ? "0 0 0 1px white" : "none",
                  }} />
                ))}
                <input type="color" value={value} onChange={(e) => setter(e.target.value)}
                  style={{ width: 26, height: 26, border: "none", borderRadius: 6, cursor: "pointer", padding: 0, background: "transparent" }} />
              </div>
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: value }} />
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{value}</span>
              </div>
            </div>
          ))}
          <p style={{ margin: "4px 0 0", fontSize: 10, color: "var(--text-muted)" }}>
            La couleur accent change lors du basculement d&apos;espace de travail.
          </p>
        </div>

        {/* Save */}
        <button
          className="btn-primary"
          onClick={save}
          style={{ alignSelf: "flex-end", minWidth: 160, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {saved ? (
            <><Icon name="check" size={14} /> Enregistré !</>
          ) : "Enregistrer les préférences"}
        </button>

      </div>
    </div>
  );
}
