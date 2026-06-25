"use client";

import { useState, useEffect } from "react";

interface Settings {
  ca_objectif: number;
  exercice_debut: string;
  exercice_fin: string;
  fg_coefficient: number;
  commission_commercial: number;
  devis_relance_jours: number;
}

export function ParametresBoard({ onSaved }: { onSaved?: () => void }) {
  const [form, setForm] = useState<Settings>({
    ca_objectif: 600000,
    exercice_debut: `${new Date().getFullYear()}-10-01`,
    exercice_fin: `${new Date().getFullYear() + 1}-09-30`,
    fg_coefficient: 35,
    commission_commercial: 8,
    devis_relance_jours: 30,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        // Convertit l'ancien format "MM-DD" en "YYYY-MM-DD" si besoin
        function toFullDate(s: string, isFin: boolean): string {
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
          const [m, d] = s.split("-").map(Number);
          const y = new Date().getFullYear();
          return `${isFin ? y + 1 : y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        }
        setForm({
          ca_objectif: Number(data.ca_objectif) || 600000,
          exercice_debut: toFullDate(String(data.exercice_debut || "10-01"), false),
          exercice_fin: toFullDate(String(data.exercice_fin || "09-30"), true),
          fg_coefficient: Number(data.fg_coefficient) || 35,
          commission_commercial: Number(data.commission_commercial) || 8,
          devis_relance_jours: Number(data.devis_relance_jours) || 30,
        });
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved?.();
    }
  }

  function field(label: string, key: keyof Settings, type: "number" | "text" | "date", unit?: string, hint?: string) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{label}</label>
        {hint && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{hint}</div>}
        <div style={{ position: "relative" }}>
          <input
            type={type}
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
            style={{
              width: "100%", padding: unit ? "8px 36px 8px 12px" : "8px 12px",
              border: "1.5px solid var(--border)", borderRadius: 10,
              fontSize: 14, background: "var(--surface)", color: "var(--text)",
              boxSizing: "border-box", outline: "none",
            }}
          />
          {unit && (
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-muted)", pointerEvents: "none" }}>
              {unit}
            </span>
          )}
        </div>
      </div>
    );
  }

  const margeEstimee = form.ca_objectif * (1 - form.fg_coefficient / 100);
  const commissionEstimee = form.ca_objectif * (form.commission_commercial / 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 560 }}>

      {/* ── Objectifs ── */}
      <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1.5px solid var(--border)", background: "var(--surface2)" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Objectifs</span>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {field("Objectif CA annuel", "ca_objectif", "number", "€", "CA à atteindre sur l'exercice")}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>{field("Début exercice", "exercice_debut", "date", undefined, "Premier jour de l'exercice fiscal")}</div>
            <div style={{ flex: 1 }}>{field("Fin exercice", "exercice_fin", "date", undefined, "Dernier jour de l'exercice fiscal")}</div>
          </div>
        </div>
      </div>

      {/* ── Rentabilité ── */}
      <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1.5px solid var(--border)", background: "var(--surface2)" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Rentabilité</span>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {field("Coefficient frais généraux", "fg_coefficient", "number", "%", "Loyer, charges salariales, véhicules, divers — en % du CA")}
          <div style={{ padding: "10px 14px", background: "var(--accent-soft)", borderRadius: 10, border: "1px solid var(--accent)", fontSize: 12 }}>
            Marge nette estimée sur objectif :{" "}
            <strong style={{ color: "var(--accent)" }}>
              {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(margeEstimee)}
            </strong>
          </div>
        </div>
      </div>

      {/* ── Commercial ── */}
      <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1.5px solid var(--border)", background: "var(--surface2)" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Commercial</span>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {field("Commission commercial", "commission_commercial", "number", "%", "Appliquée sur le CA signé")}
          {field("Délai de relance devis", "devis_relance_jours", "number", "jours", "Un devis envoyé depuis plus de X jours apparaît comme non relancé")}
          <div style={{ padding: "10px 14px", background: "#e6f4ed", borderRadius: 10, border: "1px solid #86efac", fontSize: 12 }}>
            Commission estimée sur objectif CA :{" "}
            <strong style={{ color: "#16a34a" }}>
              {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(commissionEstimee)}
            </strong>
          </div>
        </div>
      </div>

      {/* ── Bouton sauvegarder ── */}
      <button onClick={handleSave} disabled={saving} style={{
        padding: "12px 24px", borderRadius: 11, border: "none", cursor: saving ? "not-allowed" : "pointer",
        background: saved ? "#16a34a" : "var(--accent)", color: "#fff",
        fontSize: 14, fontWeight: 700, transition: "background 0.2s", opacity: saving ? 0.7 : 1,
      }}>
        {saved ? "Enregistré ✓" : saving ? "Enregistrement…" : "Enregistrer les paramètres"}
      </button>

    </div>
  );
}
