"use client";

import { useState, useEffect, useCallback } from "react";

interface Props {
  caObjectif: number;
  exerciceDebut?: string;
  exerciceFin?: string;
  activites?: string[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const fmtK = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(".", ",")} M€`;
  if (n >= 1000) return `${Math.round(n / 1000)} k€`;
  return fmt(n);
};

export function CAProgressGauge({ caObjectif, exerciceDebut, exerciceFin, activites = [] }: Props) {
  const [caFacture, setCaFacture] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Factures Envoyées (signed) + Factures Payées (paid), filtrées par exercice
      const params = new URLSearchParams({ statuts: "signed,paid", limit: "1" });
      if (activites.length > 0) params.set("activites", activites.join(","));
      if (exerciceDebut) params.set("debut", exerciceDebut);
      if (exerciceFin) params.set("fin", exerciceFin);
      const r = await fetch(`/api/finances/devis?${params}`);
      if (!r.ok) return;
      const data = await r.json();
      const s = data.summary ?? {};
      setCaFacture((s.signed?.total ?? 0) + (s.paid?.total ?? 0));
    } finally {
      setLoading(false);
    }
  }, [activites, exerciceDebut, exerciceFin]);

  useEffect(() => { load(); }, [load]);

  const pct = caObjectif > 0 ? Math.min((caFacture / caObjectif) * 100, 100) : 0;
  const restant = Math.max(caObjectif - caFacture, 0);

  const moisRestants = exerciceFin
    ? Math.max(0, Math.ceil((new Date(exerciceFin).getTime() - Date.now()) / (30.44 * 24 * 3600 * 1000)))
    : null;

  const nbMoisExercice = exerciceDebut && exerciceFin
    ? Math.round((new Date(exerciceFin).getTime() - new Date(exerciceDebut).getTime()) / (30.44 * 24 * 3600 * 1000))
    : 12;
  const cibleMensuelle = caObjectif > 0 ? caObjectif / nbMoisExercice : 0;
  const moisEcoules = nbMoisExercice - (moisRestants ?? 0);
  const cibleADate = cibleMensuelle * moisEcoules;
  const avanceSurCible = caFacture - cibleADate;
  const enAvance = avanceSurCible >= 0;

  const barColor = pct >= 100 ? "#16a34a" : pct >= 75 ? "#b5612f" : pct >= 50 ? "#2563eb" : "#ea580c";

  if (loading) return (
    <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>
      Chargement…
    </div>
  );

  return (
    <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 16, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              CA Facturé — Exercice en cours
            </span>
            {/* Note avoirs */}
            <span style={{ fontSize: 10, color: "#ea580c", background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 999, padding: "1px 7px", fontWeight: 600 }}>
              avoirs non déduits
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: barColor, lineHeight: 1 }}>{fmtK(caFacture)}</span>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>facturé</span>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
            Factures envoyées + payées · hors avoirs
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 2 }}>
            Objectif <strong style={{ color: "var(--text)" }}>{fmtK(caObjectif)}</strong>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: barColor }}>
            {pct.toFixed(1)} %
          </div>
        </div>
      </div>

      <div style={{ height: 10, background: "var(--border)", borderRadius: 999, overflow: "hidden", position: "relative" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 999, transition: "width 0.8s ease" }} />
        {cibleADate > 0 && cibleADate < caObjectif && (
          <div style={{
            position: "absolute", top: 0, bottom: 0,
            left: `${Math.min((cibleADate / caObjectif) * 100, 100)}%`,
            width: 2, background: "rgba(0,0,0,0.25)", borderRadius: 1,
          }} />
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Restant : <strong style={{ color: "var(--text)" }}>{fmtK(restant)}</strong>
          </span>
          {moisRestants !== null && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              · {moisRestants} mois restant{moisRestants > 1 ? "s" : ""}
            </span>
          )}
          {cibleMensuelle > 0 && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              · Cible mensuelle : <strong>{fmtK(cibleMensuelle)}</strong>
            </span>
          )}
        </div>
        {moisEcoules > 0 && cibleADate > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
            background: enAvance ? "#e6f4ed" : "#fff7ed",
            color: enAvance ? "#16a34a" : "#ea580c",
            border: `1px solid ${enAvance ? "#86efac" : "#fdba74"}`,
            whiteSpace: "nowrap",
          }}>
            {enAvance ? "+" : ""}{fmtK(Math.abs(avanceSurCible))} {enAvance ? "d'avance" : "de retard"} sur l'objectif
          </span>
        )}
      </div>
    </div>
  );
}
