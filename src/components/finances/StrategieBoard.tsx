"use client";

import { useState, useEffect } from "react";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";

interface StatsMonth {
  id: string;
  debut: string;
  ca_reel_ht: number;
  ca_previsionnel_ht: number;
  ca_main_oeuvre: number;
  ca_fournitures: number;
  ca_en_retard_ht: number;
  devis_signes_ht: number;
  devis_previsionnel_ht: number;
  marge_reelle: number;
  marge_previsionnelle: number;
}

interface StatsResponse {
  settings: { caObjectif: number; fgCoefficient: number; exerciceDebut: string; exerciceFin: string };
  exercice: { debut: string; fin: string };
  annual: StatsMonth;
  quarterly: { label: string; ca_reel_ht: number; ca_previsionnel_ht: number; devis_signes_ht: number; marge_reelle: number }[];
  monthly: StatsMonth[];
  kpis: { avancementPct: number; margeNette: number; margeNettePct: number };
}

type View = "annual" | "quarterly" | "monthly";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const fmtK = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(".", ",")} M€`;
  if (n >= 1000) return `${Math.round(n / 1000)} k€`;
  return fmt(n);
};

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Fév", "03": "Mar", "04": "Avr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Aoû",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Déc",
};

function GaugeBar({ value, max, color = "var(--accent)" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ height: 8, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999, transition: "width 0.6s ease" }} />
    </div>
  );
}

function KpiCard({ label, value, sub, accent, color }: { label: string; value: string; sub?: string; accent?: boolean; color?: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 140,
      background: accent ? "var(--accent-soft)" : "var(--surface)",
      border: `1.5px solid ${accent ? "var(--accent)" : "var(--border)"}`,
      borderRadius: 14, padding: "16px 18px",
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: color ?? (accent ? "var(--accent)" : "var(--text-muted)"), textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color ?? (accent ? "var(--accent)" : "var(--text)"), lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function BarChart({ data, valueKey, labelKey, maxVal }: {
  data: Record<string, string | number>[];
  valueKey: string;
  labelKey: string;
  maxVal: number;
}) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 100, overflowX: "auto", paddingBottom: 4 }}>
      {data.map((d) => {
        const val = Number(d[valueKey]) || 0;
        const h = maxVal > 0 ? Math.max(Math.round((val / maxVal) * 80), val > 0 ? 4 : 0) : 0;
        return (
          <div key={d[labelKey] as string} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1, minWidth: 32 }}>
            {val > 0 && <div style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 600 }}>{fmtK(val)}</div>}
            <div style={{
              width: "100%", height: h || 3, background: val > 0 ? "var(--accent)" : "var(--border)",
              borderRadius: "4px 4px 0 0", opacity: val > 0 ? 0.85 : 0.3,
            }} />
            <div style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "center", whiteSpace: "nowrap" }}>
              {d[labelKey] as string}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StrategieBoard() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("annual");

  useEffect(() => {
    fetch("/api/finances/stats")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Chargement…</div>;

  if (!data || !data.annual) {
    return (
      <div style={{ padding: "32px 20px", textAlign: "center", background: "var(--surface)", borderRadius: 14, border: "1.5px solid var(--border)" }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>📊</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Aucune statistique synchronisée</div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 auto", maxWidth: 340 }}>
          Demandez à Aria de synchroniser les statistiques Interfast pour activer cette vue.
        </p>
      </div>
    );
  }

  const { settings, exercice, annual, quarterly, monthly, kpis } = data;
  const avPct = kpis.avancementPct;
  const prevPct = settings.caObjectif > 0 ? Math.min((annual.ca_previsionnel_ht / settings.caObjectif) * 100, 100) : 0;

  // Données pour les graphiques
  const monthlyChart = monthly
    .filter((m) => m.ca_reel_ht > 0 || m.ca_previsionnel_ht > 0)
    .map((m) => ({
      label: MONTH_LABELS[m.id.slice(5)] ?? m.id.slice(5),
      ca_reel_ht: m.ca_reel_ht,
      ca_previsionnel_ht: m.ca_previsionnel_ht,
    }));
  const maxMonthly = Math.max(...monthlyChart.map((m) => m.ca_reel_ht), 1);

  const quarterlyChart = quarterly.map((q) => ({
    label: q.label,
    ca_reel_ht: q.ca_reel_ht,
  }));
  const maxQuarterly = Math.max(...quarterlyChart.map((q) => q.ca_reel_ht), 1);

  const exerciceLabel = `Exercice ${new Date(exercice.debut).getFullYear()}–${new Date(exercice.fin).getFullYear()}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Header : exercice + toggle vue ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-soft)" }}>{exerciceLabel}</div>
        <div style={{ display: "flex", gap: 4, background: "var(--surface2)", borderRadius: 10, padding: 3, border: "1.5px solid var(--border)" }}>
          {(["annual", "quarterly", "monthly"] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: view === v ? "#fff" : "transparent",
              color: view === v ? "var(--accent)" : "var(--text-muted)",
              boxShadow: view === v ? "0 1px 4px rgba(40,30,20,0.10)" : "none",
              transition: "all 0.15s",
            }}>
              {v === "annual" ? "Annuel" : v === "quarterly" ? "Trimestriel" : "Mensuel"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Jauge CA principal ── */}
      <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 16, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div>
            <span style={{ fontSize: 32, fontWeight: 800, color: "var(--accent)" }}>{fmtK(annual.ca_reel_ht)}</span>
            <span style={{ fontSize: 15, color: "var(--text-muted)", marginLeft: 8 }}>réalisé</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Objectif <strong style={{ color: "var(--text)" }}>{fmtK(settings.caObjectif)}</strong></div>
            <div style={{ fontSize: 22, fontWeight: 800, color: avPct >= 100 ? "#16a34a" : avPct >= 75 ? "var(--accent)" : "#2563eb" }}>
              {avPct.toFixed(1)} %
            </div>
          </div>
        </div>
        <GaugeBar value={annual.ca_reel_ht} max={settings.caObjectif} color="var(--accent)" />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
          <span>CA prévisionnel : <strong style={{ color: "var(--text)" }}>{fmtK(annual.ca_previsionnel_ht)}</strong> ({prevPct.toFixed(0)} % objectif)</span>
          <span>Restant : <strong>{fmtK(Math.max(settings.caObjectif - annual.ca_reel_ht, 0))}</strong></span>
        </div>
        {annual.ca_previsionnel_ht > 0 && (
          <div style={{ marginTop: 8 }}>
            <GaugeBar value={annual.ca_previsionnel_ht} max={settings.caObjectif} color="#93c5fd" />
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>Prévisionnel (chantiers planifiés)</div>
          </div>
        )}
      </div>

      {/* ── KPI cards ── */}
      <CollapsibleSection title="Indicateurs clés" storageKey="finances.strategie.kpis">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "12px 16px" }}>
          <KpiCard
            label="Marge nette estimée"
            value={fmtK(kpis.margeNette)}
            sub={`Après ${settings.fgCoefficient} % de frais généraux`}
            accent
          />
          <KpiCard
            label="Devis signés (entrées)"
            value={fmtK(annual.devis_signes_ht)}
            sub="Nouveau CA signé sur l'exercice"
          />
          <KpiCard
            label="Pipeline prévisionnel"
            value={fmtK(annual.devis_previsionnel_ht)}
            sub="Total devis en cours"
          />
          <KpiCard
            label="À encaisser"
            value={fmtK(annual.ca_en_retard_ht ?? 0)}
            sub="CA en retard de règlement"
            color={annual.ca_en_retard_ht > 5000 ? "#dc2626" : undefined}
          />
        </div>
      </CollapsibleSection>

      {/* ── Graphique selon la vue ── */}
      <CollapsibleSection
        title={`CA réalisé — ${view === "annual" ? "Vue annuelle" : view === "quarterly" ? "Par trimestre" : "Par mois"}`}
        storageKey="finances.strategie.graphique"
      >
        <div style={{ padding: "16px" }}>
          {view === "monthly" && monthlyChart.length > 0 && (
            <BarChart data={monthlyChart} valueKey="ca_reel_ht" labelKey="label" maxVal={maxMonthly} />
          )}
          {view === "quarterly" && (
            <BarChart data={quarterlyChart} valueKey="ca_reel_ht" labelKey="label" maxVal={maxQuarterly} />
          )}
          {view === "annual" && (
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {[
                { label: "CA réalisé", value: annual.ca_reel_ht, color: "var(--accent)" },
                { label: "Main-d'œuvre", value: annual.ca_main_oeuvre, color: "#2563eb" },
                { label: "Fournitures", value: annual.ca_fournitures, color: "#0d9488" },
              ].map((item) => (
                <div key={item.label} style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{fmtK(item.value)}</div>
                  <div style={{ marginTop: 6, height: 6, background: "var(--border)", borderRadius: 999 }}>
                    <div style={{ height: "100%", width: `${Math.min((item.value / annual.ca_reel_ht) * 100, 100)}%`, background: item.color, borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>

    </div>
  );
}
