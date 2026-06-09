"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icons";
import type { AppSettings, Layout, Density } from "@/types";

type Ton = "direct" | "chaleureux" | "exigeant";

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

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

const WORKSPACE_COLORS = [
  { label: "Terracotta", value: "#b5612f" },
  { label: "Bleu marine", value: "#2563eb" },
  { label: "Vert forêt", value: "#16a34a" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Bordeaux", value: "#9f1239" },
  { label: "Teal", value: "#0d9488" },
];

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ton, setTon] = useState<Ton>("direct");
  const [layout, setLayout] = useState<Layout>("equilibre");
  const [density, setDensity] = useState<Density>("regular");
  const [saved, setSaved] = useState(false);
  const [msStatus, setMsStatus] = useState<"unknown" | "connected" | "error">("unknown");
  const [disconnecting, setDisconnecting] = useState(false);
  const [colorPro, setColorPro] = useState("#b5612f");
  const [colorPerso, setColorPerso] = useState("#2563eb");

  useEffect(() => {
    try {
      const s = localStorage.getItem("aria-settings");
      if (s) {
        const parsed: AppSettings = JSON.parse(s);
        if (parsed.ton) setTon(parsed.ton);
        if (parsed.layout) setLayout(parsed.layout);
        if (parsed.density) setDensity(parsed.density);
      }
      const colors = localStorage.getItem("aria-workspace-colors");
      if (colors) {
        const c = JSON.parse(colors);
        if (c.pro) setColorPro(c.pro);
        if (c.perso) setColorPerso(c.perso);
      }
    } catch {
      // ignore
    }

    const ms = searchParams.get("ms");
    if (ms === "connected") setMsStatus("connected");
    else if (ms === "error") setMsStatus("error");
    else {
      // Vérifier si connecté en testant l'API
      fetch("/api/microsoft/mails")
        .then((r) => {
          if (r.status === 200) setMsStatus("connected");
          else setMsStatus("unknown");
        })
        .catch(() => setMsStatus("unknown"));
    }
  }, [searchParams]);

  function save() {
    const settings: AppSettings = { ton, layout, density };
    localStorage.setItem("aria-settings", JSON.stringify(settings));
    localStorage.setItem("aria-workspace-colors", JSON.stringify({ pro: colorPro, perso: colorPerso }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function connectMicrosoft() {
    window.location.href = "/api/microsoft/connect";
  }

  async function disconnectMicrosoft() {
    if (!confirm("Déconnecter le compte Microsoft 365 ? Vous devrez vous reconnecter pour accéder aux mails, tâches et agenda.")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/microsoft/disconnect", { method: "POST" });
      if (res.ok) setMsStatus("unknown");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <button
            onClick={() => router.push("/")}
            className="btn-ghost"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px" }}
          >
            <Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }} />
            Retour
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>Personnalisation</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Adaptez Aria Coach à votre façon de travailler</p>
          </div>
        </div>

        {/* Connexions */}
        <div className="card" style={{ padding: "20px 24px" }}>
          <p className="kicker" style={{ marginBottom: 16 }}>Connexions</p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--surface)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#0078d4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="mail" size={18} style={{ color: "#fff" }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "var(--text)" }}>Microsoft 365</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
                {msStatus === "connected"
                  ? "Connecté — Outlook, To Do, OneNote"
                  : msStatus === "error"
                  ? "Erreur de connexion"
                  : "Non connecté"}
              </p>
            </div>
            {msStatus === "connected" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--success)", padding: "4px 10px", borderRadius: 999, background: "color-mix(in srgb, var(--success) 12%, white)" }}>
                  ✓ Connecté
                </span>
                <button
                  className="btn-ghost"
                  onClick={disconnectMicrosoft}
                  disabled={disconnecting}
                  style={{ fontSize: 12, padding: "6px 12px", color: "var(--accent)" }}
                >
                  {disconnecting ? "Déconnexion…" : "Déconnecter"}
                </button>
              </div>
            ) : (
              <button
                className="btn-primary"
                onClick={connectMicrosoft}
                style={{ fontSize: 13, padding: "8px 16px" }}
              >
                Connecter
              </button>
            )}
          </div>
          {msStatus === "error" && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--accent)" }}>
              La connexion a échoué. Vérifiez vos paramètres Azure et réessayez.
            </p>
          )}
        </div>

        {/* Ton du coach */}
        <div className="card" style={{ padding: "20px 24px" }}>
          <p className="kicker" style={{ marginBottom: 16 }}>Ton du coach</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tonOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTon(opt.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: `2px solid ${ton === opt.id ? "var(--accent)" : "var(--border)"}`,
                  background: ton === opt.id ? "var(--accent-soft)" : "var(--surface)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: `2px solid ${ton === opt.id ? "var(--accent)" : "var(--border)"}`,
                    background: ton === opt.id ? "var(--accent)" : "transparent",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {ton === opt.id && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{opt.label}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Layout */}
        <div className="card" style={{ padding: "20px 24px" }}>
          <p className="kicker" style={{ marginBottom: 16 }}>Disposition du dashboard</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {layoutOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setLayout(opt.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: `2px solid ${layout === opt.id ? "var(--accent)" : "var(--border)"}`,
                  background: layout === opt.id ? "var(--accent-soft)" : "var(--surface)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: `2px solid ${layout === opt.id ? "var(--accent)" : "var(--border)"}`,
                    background: layout === opt.id ? "var(--accent)" : "transparent",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {layout === opt.id && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{opt.label}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Density */}
        <div className="card" style={{ padding: "20px 24px" }}>
          <p className="kicker" style={{ marginBottom: 16 }}>Densité de l&apos;interface</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {densityOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setDensity(opt.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: `2px solid ${density === opt.id ? "var(--accent)" : "var(--border)"}`,
                  background: density === opt.id ? "var(--accent-soft)" : "var(--surface)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: `2px solid ${density === opt.id ? "var(--accent)" : "var(--border)"}`,
                    background: density === opt.id ? "var(--accent)" : "transparent",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {density === opt.id && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{opt.label}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Couleurs des espaces */}
        <div className="card" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Icon name="palette" size={15} style={{ color: "var(--accent)" }} />
            <p className="kicker" style={{ margin: 0 }}>Couleurs des espaces de travail</p>
          </div>
          {[
            { label: "Espace Pro", key: "pro" as const, value: colorPro, setter: setColorPro },
            { label: "Espace Perso", key: "perso" as const, value: colorPerso, setter: setColorPerso },
          ].map(({ label, value, setter }) => (
            <div key={label} style={{ marginBottom: 16 }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{label}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {WORKSPACE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    title={c.label}
                    onClick={() => setter(c.value)}
                    style={{
                      width: 28, height: 28, borderRadius: "50%", background: c.value, border: "none",
                      cursor: "pointer", flexShrink: 0,
                      outline: value === c.value ? `3px solid ${c.value}` : "none",
                      outlineOffset: 2,
                      boxShadow: value === c.value ? "0 0 0 1px white" : "none",
                      transition: "outline 0.1s",
                    }}
                  />
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Personnalisé :</span>
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    style={{ width: 28, height: 28, border: "none", borderRadius: 6, cursor: "pointer", padding: 0, background: "transparent" }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: value }} />
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>{value}</span>
              </div>
            </div>
          ))}
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
            La couleur s&apos;applique à l&apos;accent global lors du changement d&apos;espace.
          </p>
        </div>

        {/* Save */}
        <button
          className="btn-primary"
          onClick={save}
          style={{ alignSelf: "flex-end", minWidth: 160, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {saved ? (
            <>
              <Icon name="check" size={15} />
              Enregistré !
            </>
          ) : (
            "Enregistrer"
          )}
        </button>
      </div>
    </div>
  );
}
