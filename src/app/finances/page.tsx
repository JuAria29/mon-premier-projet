"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icons";

// ─── Types ───────────────────────────────────────────────────────────────────

interface InterfastStats {
  exercise_start: string;
  exercise_end: string;
  ca_reel: number;
  ca_previsionnel: number;
  devis_signes: number;
  achats: number;
  retards: number;
  tva_reel: number;
  mo_reel: number;
  fournitures_reel: number;
  synced_at: string;
}

interface PLInvoice {
  id: string;
  date: string;
  amountHT: number;
  amountTTC: number;
  status: string;
  customerName: string | null;
  label: string;
}

interface FinancialObjective {
  ca_objectif: number | null;
  marge_objectif: number | null;
}

interface HistoryEntry {
  exercise_start: string;
  exercise_label: string;
  ca_ht: number | null;
  masse_salariale: number | null;
  charges_vehicules: number | null;
  frais_generaux: number | null;
  achats_fournitures: number | null;
  sous_traitance: number | null;
  charges_totales: number | null;
  resultat_net: number | null;
  tresorerie_fin: number | null;
  effectif: number | null;
}

type Section = "vue" | "evolution" | "couts" | "commercial";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: decimals,
  }).format(n);
}

function pct(a: number, b: number): string {
  if (!b) return "—";
  return `${Math.round((a / b) * 100)} %`;
}

function delta(current: number | null, previous: number | null): { value: string; positive: boolean } | null {
  if (!current || !previous || previous === 0) return null;
  const d = ((current - previous) / previous) * 100;
  return { value: `${d > 0 ? "+" : ""}${Math.round(d)} %`, positive: d >= 0 };
}

const FISCAL_MONTHS = [
  { key: "2025-10", label: "Oct" },
  { key: "2025-11", label: "Nov" },
  { key: "2025-12", label: "Déc" },
  { key: "2026-01", label: "Jan" },
  { key: "2026-02", label: "Fév" },
  { key: "2026-03", label: "Mar" },
  { key: "2026-04", label: "Avr" },
  { key: "2026-05", label: "Mai" },
  { key: "2026-06", label: "Jun" },
  { key: "2026-07", label: "Jul" },
  { key: "2026-08", label: "Aoû" },
  { key: "2026-09", label: "Sep" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  sub,
  accent,
  warn,
  delta: d,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  warn?: boolean;
  delta?: { value: string; positive: boolean } | null;
}) {
  return (
    <div
      className="card"
      style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: accent
            ? "var(--accent)"
            : warn
            ? "oklch(0.52 0.085 245)"
            : "var(--text)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {sub && (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub}</span>
        )}
        {d && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: d.positive ? "oklch(0.55 0.085 155)" : "oklch(0.52 0.085 245)",
            }}
          >
            {d.value} vs N-1
          </span>
        )}
      </div>
    </div>
  );
}

function ProgressBar({
  value,
  max,
  color = "var(--accent)",
  height = 8,
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
}) {
  const w = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div
      style={{
        height,
        background: "var(--surface-2)",
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${w}%`,
          height: "100%",
          background: color,
          borderRadius: 999,
          transition: "width 0.6s ease",
        }}
      />
    </div>
  );
}

function CostBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number | null;
  total: number;
  color: string;
}) {
  if (!value) return null;
  const w = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
          alignItems: "baseline",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text)" }}>{label}</span>
        <span style={{ fontSize: 12 }}>
          <strong style={{ color: "var(--text)" }}>{fmt(value)}</strong>{" "}
          <span style={{ color: "var(--text-muted)" }}>({w} %)</span>
        </span>
      </div>
      <ProgressBar value={value} max={total} color={color} height={6} />
    </div>
  );
}

function MonthlyBarChart({ invoices }: { invoices: PLInvoice[] }) {
  const byMonth: Record<string, number> = {};
  for (const inv of invoices) {
    const key = inv.date.slice(0, 7);
    byMonth[key] = (byMonth[key] || 0) + inv.amountHT;
  }

  const values = FISCAL_MONTHS.map((m) => byMonth[m.key] ?? 0);
  const max = Math.max(...values, 1);
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 5,
        height: 130,
        padding: "0 2px",
      }}
    >
      {FISCAL_MONTHS.map(({ key, label }, i) => {
        const val = values[i];
        const barH = Math.max((val / max) * 100, val > 0 ? 4 : 0);
        const isCurrent = key === currentKey;
        const isFuture = key > currentKey;
        return (
          <div
            key={key}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              height: "100%",
              justifyContent: "flex-end",
            }}
          >
            {val > 0 && (
              <div
                style={{
                  fontSize: 8,
                  color: isCurrent ? "var(--accent)" : "var(--text-muted)",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {Math.round(val / 1000)}k
              </div>
            )}
            <div
              style={{
                width: "100%",
                height: `${barH}%`,
                background: isFuture
                  ? "var(--border)"
                  : isCurrent
                  ? "var(--accent)"
                  : "color-mix(in srgb, var(--accent) 55%, var(--surface-2))",
                borderRadius: "3px 3px 0 0",
                transition: "height 0.5s ease",
                minHeight: isFuture ? 2 : val > 0 ? 4 : 0,
              }}
            />
            <span
              style={{
                fontSize: 9,
                color: isCurrent ? "var(--accent)" : "var(--text-muted)",
                fontWeight: isCurrent ? 700 : 400,
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EvolutionChart({ history, current }: { history: HistoryEntry[]; current: InterfastStats | null }) {
  const allEntries = [
    ...history,
    ...(current
      ? [
          {
            exercise_start: current.exercise_start,
            exercise_label: "2025-2026*",
            ca_ht: current.ca_reel,
            resultat_net: null,
            masse_salariale: null,
            charges_vehicules: null,
            frais_generaux: null,
            achats_fournitures: null,
            sous_traitance: null,
            charges_totales: null,
            tresorerie_fin: null,
            effectif: null,
          },
        ]
      : []),
  ];

  if (allEntries.length === 0) return null;

  const maxCA = Math.max(...allEntries.map((e) => e.ca_ht ?? 0), 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 160, padding: "0 4px" }}>
      {allEntries.map((entry, i) => {
        const ca = entry.ca_ht ?? 0;
        const barH = Math.max((ca / maxCA) * 130, ca > 0 ? 4 : 0);
        const isCurrent = entry.exercise_label.includes("*");
        const prevCA = i > 0 ? allEntries[i - 1].ca_ht : null;
        const growth = delta(ca, prevCA);
        return (
          <div
            key={entry.exercise_start}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              height: "100%",
              justifyContent: "flex-end",
            }}
          >
            {growth && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: growth.positive ? "oklch(0.55 0.085 155)" : "oklch(0.52 0.085 245)",
                }}
              >
                {growth.value}
              </span>
            )}
            {ca > 0 && (
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>
                {Math.round(ca / 1000)}k€
              </span>
            )}
            <div
              style={{
                width: "100%",
                height: barH,
                background: isCurrent
                  ? "var(--accent)"
                  : "color-mix(in srgb, var(--accent) 50%, var(--surface-2))",
                borderRadius: "4px 4px 0 0",
                transition: "height 0.5s ease",
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: isCurrent ? "var(--accent)" : "var(--text-muted)",
                fontWeight: isCurrent ? 700 : 400,
                textAlign: "center",
              }}
            >
              {entry.exercise_label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  label: "",
  ca: "",
  masse_salariale: "",
  charges_vehicules: "",
  frais_generaux: "",
  achats_fournitures: "",
  sous_traitance: "",
  charges_totales: "",
  resultat_net: "",
  tresorerie_fin: "",
  effectif: "",
};

export default function FinancesPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>("vue");
  const [loading, setLoading] = useState(true);
  const [interfastStats, setInterfastStats] = useState<InterfastStats | null>(null);
  const [plInvoices, setPlInvoices] = useState<PLInvoice[]>([]);
  const [plConnected, setPlConnected] = useState(false);
  const [objective, setObjective] = useState<FinancialObjective>({ ca_objectif: null, marge_objectif: null });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [editObj, setEditObj] = useState(false);
  const [objInput, setObjInput] = useState("");
  const [showAddHistory, setShowAddHistory] = useState(false);
  const [historyForm, setHistoryForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const EXERCISE_START = "2025-10-01";
  const EXERCISE_END = "2026-09-30";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, plRes, objRes, histRes] = await Promise.all([
        fetch(`/api/finances/interfast?exercise_start=${EXERCISE_START}`),
        fetch(`/api/finances/pennylane/stats?from=${EXERCISE_START}&to=${EXERCISE_END}`),
        fetch(`/api/finances/objectives?exercise_start=${EXERCISE_START}`),
        fetch("/api/finances/history"),
      ]);

      if (iRes.ok) {
        const d = await iRes.json();
        setInterfastStats(d.stats ?? null);
      }
      if (plRes.ok) {
        const d = await plRes.json();
        setPlConnected(d.connected ?? false);
        setPlInvoices(d.invoices ?? []);
      }
      if (objRes.ok) {
        const d = await objRes.json();
        setObjective(d);
        setObjInput(d.ca_objectif ? String(Math.round(d.ca_objectif)) : "");
      }
      if (histRes.ok) {
        const d = await histRes.json();
        setHistory(Array.isArray(d) ? d : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveObjective() {
    setSaving(true);
    try {
      const ca = parseFloat(objInput.replace(/\s/g, "").replace(",", "."));
      if (!isNaN(ca)) {
        await fetch("/api/finances/objectives", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exercise_start: EXERCISE_START, ca_objectif: ca }),
        });
        setObjective((p) => ({ ...p, ca_objectif: ca }));
      }
    } finally {
      setSaving(false);
      setEditObj(false);
    }
  }

  async function saveHistory() {
    setSaving(true);
    try {
      const n = (v: string) => (v.trim() ? parseFloat(v.replace(/\s/g, "").replace(",", ".")) || null : null);
      await fetch("/api/finances/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise_label: historyForm.label,
          ca_ht: n(historyForm.ca),
          masse_salariale: n(historyForm.masse_salariale),
          charges_vehicules: n(historyForm.charges_vehicules),
          frais_generaux: n(historyForm.frais_generaux),
          achats_fournitures: n(historyForm.achats_fournitures),
          sous_traitance: n(historyForm.sous_traitance),
          charges_totales: n(historyForm.charges_totales),
          resultat_net: n(historyForm.resultat_net),
          tresorerie_fin: n(historyForm.tresorerie_fin),
          effectif: historyForm.effectif ? parseInt(historyForm.effectif) : null,
        }),
      });
      setShowAddHistory(false);
      setHistoryForm(EMPTY_FORM);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteHistory(exerciseStart: string) {
    if (!confirm("Supprimer cet exercice ?")) return;
    setDeletingKey(exerciseStart);
    try {
      await fetch(`/api/finances/history?exercise_start=${exerciseStart}`, { method: "DELETE" });
      load();
    } finally {
      setDeletingKey(null);
    }
  }

  // ── Computed values ──
  const caReel = interfastStats?.ca_reel ?? 0;
  const caPrev = interfastStats?.ca_previsionnel ?? 0;
  const pipeline = interfastStats?.devis_signes ?? 0;
  const retards = interfastStats?.retards ?? 0;
  const caObj = objective.ca_objectif;
  const objPct = caObj ? Math.min(Math.round((caReel / caObj) * 100), 100) : null;

  const prevYear = history.length > 0 ? history[history.length - 1] : null;
  const caGrowth = delta(caReel, prevYear?.ca_ht ?? null);

  const plPaid = plInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amountHT, 0);
  const plPending = plInvoices.filter((i) => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + i.amountHT, 0);
  const plTotal = plInvoices.reduce((s, i) => s + i.amountHT, 0);

  const tabs: { id: Section; label: string }[] = [
    { id: "vue", label: "Vue dirigeant" },
    { id: "evolution", label: "Évolution" },
    { id: "couts", label: "Structure des coûts" },
    { id: "commercial", label: "Commercial" },
  ];

  const inputStyle: React.CSSProperties = {
    padding: "7px 10px",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
    background: "var(--bg)",
    color: "var(--text)",
    width: "100%",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: "var(--text-muted)",
    display: "block",
    marginBottom: 4,
    fontWeight: 500,
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>

      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "0 20px",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0 10px" }}>
          <button
            onClick={() => router.push("/")}
            className="btn-ghost"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 9px", fontSize: 13 }}
          >
            <Icon name="chevron" size={13} style={{ transform: "rotate(180deg)" }} />
            Retour
          </button>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>
              Pilotage Financier
            </h1>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Aria Energies · Exercice oct. 2025 – sept. 2026
            </span>
          </div>
          <div style={{ flex: 1 }} />
          {interfastStats?.synced_at && (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Interfast :{" "}
              {new Date(interfastStats.synced_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          {plConnected && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "3px 8px",
                background: "oklch(0.55 0.085 155 / 12%)",
                color: "oklch(0.55 0.085 155)",
                borderRadius: 999,
              }}
            >
              Pennylane connecté
            </span>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderTop: "1px solid var(--border)" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: activeSection === tab.id ? 600 : 400,
                color: activeSection === tab.id ? "var(--accent)" : "var(--text-muted)",
                background: "transparent",
                border: "none",
                borderBottom: activeSection === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 60 }}>
            Chargement…
          </div>
        ) : (
          <>
            {/* ═══ VUE DIRIGEANT ═══════════════════════════════════════════ */}
            {activeSection === "vue" && (
              <>
                {/* KPI Row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                  <KPICard
                    label="CA Facturé"
                    value={fmt(caReel)}
                    sub="Interfast — réel HT"
                    accent
                    delta={caGrowth}
                  />
                  <KPICard
                    label="CA Prévisionnel"
                    value={fmt(caPrev)}
                    sub="Interfast — total prévu"
                  />
                  <KPICard
                    label="Pipeline signé"
                    value={fmt(pipeline)}
                    sub="Devis signés, à facturer"
                  />
                  <KPICard
                    label="Impayés"
                    value={fmt(retards)}
                    sub="Retards de paiement"
                    warn={retards > 0}
                  />
                </div>

                {/* Objectif + jauge */}
                <div className="card" style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                        Objectif CA annuel
                      </div>
                      {!editObj && (
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                          {caObj ? `${fmt(caObj)} visé — ${objPct} % réalisé` : "Aucun objectif défini"}
                        </div>
                      )}
                    </div>
                    {!editObj ? (
                      <button className="btn-ghost" onClick={() => setEditObj(true)} style={{ fontSize: 12, padding: "4px 10px" }}>
                        {caObj ? "Modifier" : "Définir l'objectif"}
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="number"
                          value={objInput}
                          onChange={(e) => setObjInput(e.target.value)}
                          placeholder="600000"
                          style={{ ...inputStyle, width: 130 }}
                          onKeyDown={(e) => e.key === "Enter" && saveObjective()}
                          autoFocus
                        />
                        <button className="btn-primary" onClick={saveObjective} disabled={saving} style={{ fontSize: 12, padding: "6px 14px" }}>
                          OK
                        </button>
                        <button className="btn-ghost" onClick={() => setEditObj(false)} style={{ fontSize: 12 }}>×</button>
                      </div>
                    )}
                  </div>
                  {caObj ? (
                    <div>
                      <ProgressBar
                        value={caReel}
                        max={caObj}
                        color={objPct && objPct >= 80 ? "oklch(0.55 0.085 155)" : "var(--accent)"}
                        height={12}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {fmt(caReel)} réalisé
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>
                          {objPct} %
                        </span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          Objectif : {fmt(caObj)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: 12, background: "var(--surface-2)", borderRadius: 999 }} />
                  )}
                </div>

                {/* Middle row */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                  {/* CA mensuel */}
                  <div className="card" style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                        CA mensuel — exercice en cours
                      </div>
                      <span style={{ fontSize: 11, color: plConnected ? "var(--text-muted)" : "var(--accent)" }}>
                        {plConnected ? "Source : Pennylane" : "Connectez Pennylane"}
                      </span>
                    </div>
                    {plConnected ? (
                      <MonthlyBarChart invoices={plInvoices} />
                    ) : (
                      <div style={{
                        height: 130,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "var(--surface-2)",
                        borderRadius: 10,
                        color: "var(--text-muted)",
                        fontSize: 12,
                        textAlign: "center",
                        padding: 16,
                      }}>
                        Ajoutez <code style={{ background: "var(--border)", borderRadius: 4, padding: "1px 5px", margin: "0 4px" }}>PENNYLANE_API_TOKEN</code> dans .env.local pour voir l&apos;évolution mensuelle
                      </div>
                    )}
                  </div>

                  {/* Répartition Interfast */}
                  <div className="card" style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 14 }}>
                      Répartition du CA
                    </div>
                    {interfastStats ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                        <CostBar label="Main d'œuvre" value={interfastStats.mo_reel} total={caReel} color="var(--accent)" />
                        <CostBar label="Fournitures" value={interfastStats.fournitures_reel} total={caReel} color="oklch(0.52 0.1 295)" />
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Solde TVA collectée</span>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt(interfastStats.tva_reel)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Ratio MO / CA</span>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>
                              {pct(interfastStats.mo_reel, caReel)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: 12 }}>Aucune donnée Interfast</p>
                    )}
                  </div>
                </div>

                {/* Pennylane detail */}
                {plConnected && plInvoices.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <KPICard label="CA Pennylane émis" value={fmt(plTotal)} sub="Factures HT" />
                    <KPICard label="Encaissé" value={fmt(plPaid)} sub="Factures payées" accent />
                    <KPICard label="En attente de paiement" value={fmt(plPending)} sub="Factures non soldées" warn={plPending > 0} />
                  </div>
                )}
              </>
            )}

            {/* ═══ ÉVOLUTION ════════════════════════════════════════════════ */}
            {activeSection === "evolution" && (
              <>
                <div className="card" style={{ padding: "16px 20px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                    Évolution du CA depuis la création
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
                    Ajoutez vos bilans des exercices précédents pour voir la courbe complète.
                  </div>
                  {(history.length > 0 || interfastStats) ? (
                    <EvolutionChart history={history} current={interfastStats} />
                  ) : (
                    <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", borderRadius: 10, color: "var(--text-muted)", fontSize: 12 }}>
                      Aucun historique — ajoutez vos exercices précédents ci-dessous
                    </div>
                  )}
                </div>

                {/* Tableau comparatif */}
                <div className="card" style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                      Bilan par exercice
                    </div>
                    <button
                      className="btn-ghost"
                      onClick={() => setShowAddHistory((v) => !v)}
                      style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}
                    >
                      <Icon name="plus" size={12} />
                      Ajouter un exercice
                    </button>
                  </div>

                  {showAddHistory && (
                    <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>
                        Nouvel exercice
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div>
                          <label style={labelStyle}>Exercice *</label>
                          <input value={historyForm.label} onChange={(e) => setHistoryForm((p) => ({ ...p, label: e.target.value }))} placeholder="ex: 2024-2025" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>CA HT (€)</label>
                          <input type="number" value={historyForm.ca} onChange={(e) => setHistoryForm((p) => ({ ...p, ca: e.target.value }))} placeholder="450000" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Résultat net (€)</label>
                          <input type="number" value={historyForm.resultat_net} onChange={(e) => setHistoryForm((p) => ({ ...p, resultat_net: e.target.value }))} placeholder="35000" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Masse salariale (€)</label>
                          <input type="number" value={historyForm.masse_salariale} onChange={(e) => setHistoryForm((p) => ({ ...p, masse_salariale: e.target.value }))} placeholder="180000" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Frais de véhicules (€)</label>
                          <input type="number" value={historyForm.charges_vehicules} onChange={(e) => setHistoryForm((p) => ({ ...p, charges_vehicules: e.target.value }))} placeholder="25000" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Frais généraux (€)</label>
                          <input type="number" value={historyForm.frais_generaux} onChange={(e) => setHistoryForm((p) => ({ ...p, frais_generaux: e.target.value }))} placeholder="40000" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Achats / fournitures (€)</label>
                          <input type="number" value={historyForm.achats_fournitures} onChange={(e) => setHistoryForm((p) => ({ ...p, achats_fournitures: e.target.value }))} placeholder="200000" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Sous-traitance (€)</label>
                          <input type="number" value={historyForm.sous_traitance} onChange={(e) => setHistoryForm((p) => ({ ...p, sous_traitance: e.target.value }))} placeholder="0" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Total charges (€)</label>
                          <input type="number" value={historyForm.charges_totales} onChange={(e) => setHistoryForm((p) => ({ ...p, charges_totales: e.target.value }))} placeholder="420000" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Trésorerie fin d'ex. (€)</label>
                          <input type="number" value={historyForm.tresorerie_fin} onChange={(e) => setHistoryForm((p) => ({ ...p, tresorerie_fin: e.target.value }))} placeholder="50000" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Effectif (ETP)</label>
                          <input type="number" value={historyForm.effectif} onChange={(e) => setHistoryForm((p) => ({ ...p, effectif: e.target.value }))} placeholder="8" style={inputStyle} />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn-primary" onClick={saveHistory} disabled={saving || !historyForm.label} style={{ fontSize: 12, padding: "7px 16px" }}>
                          {saving ? "Enregistrement…" : "Enregistrer"}
                        </button>
                        <button className="btn-ghost" onClick={() => setShowAddHistory(false)} style={{ fontSize: 12 }}>Annuler</button>
                      </div>
                    </div>
                  )}

                  {history.length === 0 && !interfastStats ? (
                    <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Aucun historique — ajoutez vos bilans précédents.</p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 700 }}>
                        <thead>
                          <tr style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            <th style={{ textAlign: "left", padding: "0 10px 8px 0", whiteSpace: "nowrap" }}>Exercice</th>
                            <th style={{ textAlign: "right", padding: "0 10px 8px", whiteSpace: "nowrap" }}>CA HT</th>
                            <th style={{ textAlign: "right", padding: "0 10px 8px", whiteSpace: "nowrap" }}>Masse sal.</th>
                            <th style={{ textAlign: "right", padding: "0 10px 8px", whiteSpace: "nowrap" }}>Véhicules</th>
                            <th style={{ textAlign: "right", padding: "0 10px 8px", whiteSpace: "nowrap" }}>Frais gén.</th>
                            <th style={{ textAlign: "right", padding: "0 10px 8px", whiteSpace: "nowrap" }}>Achats</th>
                            <th style={{ textAlign: "right", padding: "0 10px 8px", whiteSpace: "nowrap" }}>Résultat net</th>
                            <th style={{ textAlign: "right", padding: "0 10px 8px", whiteSpace: "nowrap" }}>Trésorerie</th>
                            <th style={{ textAlign: "right", padding: "0 0 8px 8px", whiteSpace: "nowrap" }}>ETP</th>
                            <th style={{ width: 32 }} />
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((h) => (
                            <tr key={h.exercise_start} style={{ borderTop: "1px solid var(--border)" }}>
                              <td style={{ padding: "10px 10px 10px 0", fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap" }}>{h.exercise_label}</td>
                              <td style={{ textAlign: "right", padding: "10px", fontWeight: 600 }}>{fmt(h.ca_ht)}</td>
                              <td style={{ textAlign: "right", padding: "10px", color: "var(--text-muted)" }}>{fmt(h.masse_salariale)}</td>
                              <td style={{ textAlign: "right", padding: "10px", color: "var(--text-muted)" }}>{fmt(h.charges_vehicules)}</td>
                              <td style={{ textAlign: "right", padding: "10px", color: "var(--text-muted)" }}>{fmt(h.frais_generaux)}</td>
                              <td style={{ textAlign: "right", padding: "10px", color: "var(--text-muted)" }}>{fmt(h.achats_fournitures)}</td>
                              <td style={{ textAlign: "right", padding: "10px", fontWeight: 600, color: h.resultat_net && h.resultat_net >= 0 ? "oklch(0.55 0.085 155)" : "oklch(0.52 0.085 245)" }}>
                                {fmt(h.resultat_net)}
                              </td>
                              <td style={{ textAlign: "right", padding: "10px" }}>{fmt(h.tresorerie_fin)}</td>
                              <td style={{ textAlign: "right", padding: "10px 0 10px 8px", color: "var(--text-muted)" }}>{h.effectif ?? "—"}</td>
                              <td style={{ textAlign: "right", padding: "10px 0" }}>
                                <button
                                  onClick={() => deleteHistory(h.exercise_start)}
                                  disabled={deletingKey === h.exercise_start}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
                                >
                                  <Icon name="close" size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {/* Exercice en cours */}
                          {interfastStats && (
                            <tr style={{ borderTop: "1px solid var(--border)", background: "var(--accent-soft)" }}>
                              <td style={{ padding: "10px 10px 10px 0", fontWeight: 700, color: "var(--accent)" }}>2025-2026 *</td>
                              <td style={{ textAlign: "right", padding: "10px", fontWeight: 700, color: "var(--accent)" }}>{fmt(caReel)}</td>
                              <td style={{ textAlign: "right", padding: "10px", color: "var(--text-muted)" }}>—</td>
                              <td style={{ textAlign: "right", padding: "10px", color: "var(--text-muted)" }}>—</td>
                              <td style={{ textAlign: "right", padding: "10px", color: "var(--text-muted)" }}>—</td>
                              <td style={{ textAlign: "right", padding: "10px", color: "var(--text-muted)" }}>{fmt(interfastStats.achats)}</td>
                              <td style={{ textAlign: "right", padding: "10px", color: "var(--text-muted)" }}>—</td>
                              <td style={{ textAlign: "right", padding: "10px", color: "var(--text-muted)" }}>—</td>
                              <td style={{ textAlign: "right", padding: "10px 0", color: "var(--text-muted)" }}>—</td>
                              <td />
                            </tr>
                          )}
                        </tbody>
                      </table>
                      {interfastStats && (
                        <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "8px 0 0" }}>
                          * Exercice en cours — données Interfast temps réel, charges à renseigner en fin d&apos;exercice
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ═══ STRUCTURE DES COÛTS ═════════════════════════════════════ */}
            {activeSection === "couts" && (
              <>
                {prevYear ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {/* Dernier bilan complet */}
                    <div className="card" style={{ padding: "16px 20px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                        Structure des charges — {prevYear.exercise_label}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
                        Dernier exercice complet disponible
                      </div>
                      {(() => {
                        const total = prevYear.charges_totales ?? (
                          (prevYear.masse_salariale ?? 0) +
                          (prevYear.charges_vehicules ?? 0) +
                          (prevYear.frais_generaux ?? 0) +
                          (prevYear.achats_fournitures ?? 0) +
                          (prevYear.sous_traitance ?? 0)
                        );
                        return (
                          <div>
                            <CostBar label="Masse salariale" value={prevYear.masse_salariale} total={total} color="var(--accent)" />
                            <CostBar label="Achats / fournitures" value={prevYear.achats_fournitures} total={total} color="oklch(0.52 0.1 295)" />
                            <CostBar label="Frais généraux" value={prevYear.frais_generaux} total={total} color="oklch(0.52 0.085 245)" />
                            <CostBar label="Frais de véhicules" value={prevYear.charges_vehicules} total={total} color="oklch(0.55 0.085 155)" />
                            <CostBar label="Sous-traitance" value={prevYear.sous_traitance} total={total} color="oklch(0.52 0.1 30)" />
                            {total > 0 && (
                              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Total charges</span>
                                  <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt(total)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Ratio charges / CA</span>
                                  <span style={{ fontSize: 12, fontWeight: 600 }}>{pct(total, prevYear.ca_ht ?? 0)}</span>
                                </div>
                                {prevYear.effectif && (
                                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>CA / collaborateur</span>
                                    <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt((prevYear.ca_ht ?? 0) / prevYear.effectif)}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Indicateurs de rentabilité */}
                    <div className="card" style={{ padding: "16px 20px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 14 }}>
                        Indicateurs de rentabilité
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {[
                          { label: "CA HT", value: fmt(prevYear.ca_ht), highlight: false },
                          { label: "Total charges", value: fmt(prevYear.charges_totales), highlight: false },
                          {
                            label: "Résultat net",
                            value: fmt(prevYear.resultat_net),
                            highlight: true,
                            positive: (prevYear.resultat_net ?? 0) >= 0,
                          },
                          {
                            label: "Taux de résultat",
                            value: prevYear.ca_ht && prevYear.resultat_net != null ? pct(prevYear.resultat_net, prevYear.ca_ht) : "—",
                            highlight: false,
                          },
                          { label: "Trésorerie fin d'ex.", value: fmt(prevYear.tresorerie_fin), highlight: false },
                          {
                            label: "Masse sal. / CA",
                            value: prevYear.ca_ht && prevYear.masse_salariale ? pct(prevYear.masse_salariale, prevYear.ca_ht) : "—",
                            highlight: false,
                          },
                        ].map(({ label, value, highlight, positive }) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
                            <span style={{
                              fontSize: 13,
                              fontWeight: highlight ? 700 : 500,
                              color: highlight
                                ? (positive ? "oklch(0.55 0.085 155)" : "oklch(0.52 0.085 245)")
                                : "var(--text)",
                            }}>
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card" style={{ padding: "32px 20px", textAlign: "center" }}>
                    <Icon name="chart" size={32} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
                    <p style={{ color: "var(--text-muted)", margin: "0 0 8px", fontSize: 14 }}>Aucun bilan historique disponible</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      Allez dans l'onglet <strong>Évolution</strong> pour ajouter vos exercices précédents.
                    </p>
                  </div>
                )}

                {/* Current year Interfast breakdown */}
                {interfastStats && (
                  <div className="card" style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                      Exercice 2025-2026 — Ventilation Interfast
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
                      Données temps réel depuis Interfast — les charges comptables seront disponibles via Pennylane
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <CostBar label="Main d'œuvre (facturée)" value={interfastStats.mo_reel} total={caReel} color="var(--accent)" />
                        <CostBar label="Fournitures (facturées)" value={interfastStats.fournitures_reel} total={caReel} color="oklch(0.52 0.1 295)" />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Achats Interfast</span>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt(interfastStats.achats)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>CA Prévisionnel restant</span>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt(caPrev - caReel)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Pipeline (devis signés)</span>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt(pipeline)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Solde TVA</span>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt(interfastStats.tva_reel)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ═══ COMMERCIAL ══════════════════════════════════════════════ */}
            {activeSection === "commercial" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  <KPICard
                    label="CA Facturé"
                    value={fmt(caReel)}
                    sub="Réalisé HT"
                    accent
                  />
                  <KPICard
                    label="CA Prévisionnel"
                    value={fmt(caPrev)}
                    sub="En cours + à venir"
                  />
                  <KPICard
                    label="Écart prév. / réalisé"
                    value={fmt(caPrev - caReel)}
                    sub="Reste à facturer"
                  />
                  <KPICard
                    label="Devis signés (pipeline)"
                    value={fmt(pipeline)}
                    sub="À facturer prochainement"
                  />
                  <KPICard
                    label="Impayés"
                    value={fmt(retards)}
                    sub="Retards de règlement"
                    warn={retards > 0}
                  />
                  <KPICard
                    label="Achats matériaux"
                    value={fmt(interfastStats?.achats)}
                    sub="Valeur devis (Interfast)"
                  />
                </div>

                {interfastStats && (
                  <div className="card" style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 14 }}>
                      Analyse commerciale — exercice en cours
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Production
                        </div>
                        {[
                          { label: "Main d'œuvre facturée", value: fmt(interfastStats.mo_reel) },
                          { label: "Part MO dans CA", value: pct(interfastStats.mo_reel, caReel) },
                          { label: "Fournitures facturées", value: fmt(interfastStats.fournitures_reel) },
                          { label: "Part fournitures dans CA", value: pct(interfastStats.fournitures_reel, caReel) },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{value}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Facturation
                        </div>
                        {[
                          { label: "TVA collectée", value: fmt(interfastStats.tva_reel) },
                          { label: "CA réalisé / prévisionnel", value: `${Math.round((caReel / caPrev) * 100)} %` },
                          { label: "Impayés / CA réalisé", value: pct(retards, caReel) },
                          { label: "Pipeline / CA réalisé", value: pct(pipeline, caReel) },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!interfastStats && (
                  <div className="card" style={{ padding: "32px 20px", textAlign: "center" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                      Aucune donnée Interfast synchronisée. Demandez à Aria de synchroniser les données.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
