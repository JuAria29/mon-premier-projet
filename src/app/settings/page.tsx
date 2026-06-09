"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [ton, setTon] = useState<Ton>("direct");
  const [layout, setLayout] = useState<Layout>("equilibre");
  const [density, setDensity] = useState<Density>("regular");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem("aria-settings");
      if (s) {
        const parsed: AppSettings = JSON.parse(s);
        if (parsed.ton) setTon(parsed.ton);
        if (parsed.layout) setLayout(parsed.layout);
        if (parsed.density) setDensity(parsed.density);
      }
    } catch {
      // ignore
    }
  }, []);

  function save() {
    const settings: AppSettings = { ton, layout, density };
    localStorage.setItem("aria-settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
