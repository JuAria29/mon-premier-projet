"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icons";
import {
  FISCAL_MONTH_KEYS,
  FISCAL_MONTH_LABELS,
  getCurrentFiscalYear,
} from "@/lib/fiscal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FiscalYear { start: string; end: string; label: string; startYear: number; isCurrent: boolean }

interface InterfastStats {
  exercise_start: string; exercise_end: string;
  ca_reel: number; ca_previsionnel: number; devis_signes: number;
  achats: number; retards: number; tva_reel: number;
  mo_reel: number; fournitures_reel: number; synced_at: string;
}

interface PLInvoice {
  id: string; date: string; amountHT: number; amountTTC: number;
  status: string; customerName: string | null; label: string;
}

interface PLHistoryEntry {
  startYear: number; label: string; start: string; end: string; isCurrent: boolean;
  ca_ht: number; charges_fournisseurs: number; resultat_partiel: number;
  invoice_count: number; charge_count: number;
  monthly_ca: Record<string, number>;
  status_breakdown: Record<string, number>;
}

interface FinancialObjective { ca_objectif: number | null; marge_objectif: number | null }

interface ManualHistoryEntry {
  exercise_start: string; exercise_label: string;
  ca_ht: number | null; masse_salariale: number | null;
  charges_vehicules: number | null; frais_generaux: number | null;
  achats_fournitures: number | null; sous_traitance: number | null;
  charges_totales: number | null; resultat_net: number | null;
  tresorerie_fin: number | null; effectif: number | null;
}

type Tab = "comptabilite" | "activite" | "evolution" | "projection";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined, d = 0) => {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: d }).format(n);
};

const pct = (a: number, b: number, suffix = " %") =>
  b > 0 ? `${Math.round((a / b) * 100)}${suffix}` : "—";

const delta = (cur: number | null, prev: number | null) => {
  if (!cur || !prev || prev === 0) return null;
  const d = ((cur - prev) / prev) * 100;
  return { value: `${d > 0 ? "+" : ""}${Math.round(d)} %`, positive: d >= 0 };
};

// ─── UI Atoms ─────────────────────────────────────────────────────────────────

function KPI({ label, value, sub, color, delta: d }: {
  label: string; value: string; sub?: string;
  color?: "accent" | "green" | "blue" | "warn"; delta?: { value: string; positive: boolean } | null;
}) {
  const c = color === "accent" ? "var(--accent)" : color === "green" ? "oklch(0.55 0.085 155)"
    : color === "blue" ? "oklch(0.52 0.085 245)" : color === "warn" ? "oklch(0.52 0.085 245)" : "var(--text)";
  return (
    <div className="card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: c, lineHeight: 1.1 }}>{value}</div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {sub && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub}</span>}
        {d && <span style={{ fontSize: 11, fontWeight: 600, color: d.positive ? "oklch(0.55 0.085 155)" : "oklch(0.52 0.085 245)" }}>{d.value} vs N-1</span>}
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: "pennylane" | "interfast" | "manual" }) {
  const cfg = {
    pennylane: { label: "Pennylane", color: "#18A999" },
    interfast: { label: "Interfast", color: "#1e40af" },
    manual: { label: "Manuel", color: "var(--text-muted)" },
  }[source];
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: `${cfg.color}20`, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function Bar({ value, max, color = "var(--accent)", h = 8 }: { value: number; max: number; color?: string; h?: number }) {
  const w = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div style={{ height: h, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${w}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.5s ease" }} />
    </div>
  );
}

function CostRow({ label, value, total, color }: { label: string; value: number | null; total: number; color: string }) {
  if (!value) return null;
  const w = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: "var(--text)" }}>{label}</span>
        <span><strong>{fmt(value)}</strong> <span style={{ color: "var(--text-muted)" }}>({w} %)</span></span>
      </div>
      <Bar value={value} max={total} color={color} h={5} />
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function MonthlyBars({ monthlyCA, startYear }: { monthlyCA: Record<string, number>; startYear: number }) {
  const keys = FISCAL_MONTH_KEYS(startYear);
  const vals = keys.map((k) => monthlyCA[k] ?? 0);
  const max = Math.max(...vals, 1);
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120, padding: "0 2px" }}>
      {keys.map((key, i) => {
        const val = vals[i];
        const barH = Math.max((val / max) * 100, val > 0 ? 3 : 0);
        const isCurrent = key === currentKey;
        const isFuture = key > currentKey;
        return (
          <div key={key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, height: "100%", justifyContent: "flex-end" }}>
            {val > 0 && <div style={{ fontSize: 7, color: isCurrent ? "var(--accent)" : "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{Math.round(val / 1000)}k</div>}
            <div style={{ width: "100%", height: `${barH}%`, borderRadius: "3px 3px 0 0", minHeight: isFuture ? 1 : val > 0 ? 3 : 0,
              background: isFuture ? "var(--border)" : isCurrent ? "var(--accent)" : "color-mix(in srgb, var(--accent) 60%, var(--surface-2))",
              transition: "height 0.4s ease" }} />
            <span style={{ fontSize: 8, color: isCurrent ? "var(--accent)" : "var(--text-muted)", fontWeight: isCurrent ? 700 : 400 }}>{FISCAL_MONTH_LABELS[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function HistoryBars({ entries, field = "ca_ht" }: {
  entries: Array<{ label: string; ca_ht?: number; ca_reel?: number; isCurrent?: boolean }>;
  field?: string;
}) {
  const vals = entries.map((e) => (e as unknown as Record<string, number>)[field] ?? 0);
  const max = Math.max(...vals, 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 150, padding: "0 4px" }}>
      {entries.map((e, i) => {
        const val = vals[i];
        const barH = val > 0 ? Math.max((val / max) * 130, 4) : 0;
        const prev = i > 0 ? vals[i - 1] : null;
        const d = delta(val, prev);
        return (
          <div key={e.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, height: "100%", justifyContent: "flex-end" }}>
            {d && <span style={{ fontSize: 8, fontWeight: 700, whiteSpace: "nowrap", color: d.positive ? "oklch(0.55 0.085 155)" : "oklch(0.52 0.085 245)" }}>{d.value}</span>}
            {val > 0 && <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)" }}>{Math.round(val / 1000)}k€</span>}
            <div style={{ width: "100%", height: barH, borderRadius: "4px 4px 0 0",
              background: e.isCurrent ? "var(--accent)" : "color-mix(in srgb, var(--accent) 45%, var(--surface-2))",
              transition: "height 0.5s ease" }} />
            <span style={{ fontSize: 9, color: e.isCurrent ? "var(--accent)" : "var(--text-muted)", fontWeight: e.isCurrent ? 700 : 400, textAlign: "center", lineHeight: 1.2 }}>
              {e.label.replace("-20", "\n'")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Estimation logic ─────────────────────────────────────────────────────────

function computeEstimation(
  plHistory: PLHistoryEntry[],
  manualHistory: ManualHistoryEntry[],
  interfastStats: InterfastStats | null,
  currentYearPL: PLHistoryEntry | null
) {
  // Use last 3 complete years for ratios
  const complete = plHistory.filter((h) => !h.isCurrent && h.ca_ht > 0).slice(-3);

  const avgChargeRatio = complete.length
    ? complete.reduce((s, h) => s + (h.charges_fournisseurs / h.ca_ht), 0) / complete.length
    : 0.7;

  // Salary data from manual entries
  const manualComplete = manualHistory.filter((h) => h.ca_ht && h.masse_salariale);
  const avgSalaryRatio = manualComplete.length
    ? manualComplete.reduce((s, h) => s + ((h.masse_salariale ?? 0) / (h.ca_ht ?? 1)), 0) / manualComplete.length
    : null;

  const projectedCA = interfastStats?.ca_previsionnel ?? currentYearPL?.ca_ht ?? 0;
  const ytdCA = currentYearPL?.ca_ht ?? 0;

  const estimatedCharges = projectedCA * avgChargeRatio;
  const estimatedSalaries = avgSalaryRatio ? projectedCA * avgSalaryRatio : null;
  const estimatedResultPartiel = projectedCA - estimatedCharges;
  const estimatedResultNet = estimatedSalaries
    ? projectedCA - estimatedCharges - estimatedSalaries
    : null;

  // Scenarios
  const bestRatio = complete.length ? Math.min(...complete.map((h) => h.charges_fournisseurs / h.ca_ht)) : avgChargeRatio * 0.9;
  const worstRatio = complete.length ? Math.max(...complete.map((h) => h.charges_fournisseurs / h.ca_ht)) : avgChargeRatio * 1.1;

  return {
    projectedCA,
    ytdCA,
    avgChargeRatio,
    avgSalaryRatio,
    estimatedCharges,
    estimatedSalaries,
    estimatedResultPartiel,
    estimatedResultNet,
    optimiste: projectedCA * (1 - bestRatio),
    realiste: estimatedResultPartiel,
    prudent: projectedCA * (1 - worstRatio),
    dataPoints: complete.length,
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const EMPTY_HISTORY_FORM = {
  label: "", ca: "", masse_salariale: "", charges_vehicules: "",
  frais_generaux: "", achats_fournitures: "", sous_traitance: "",
  charges_totales: "", resultat_net: "", tresorerie_fin: "", effectif: "",
};

export default function FinancesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("comptabilite");
  const [loading, setLoading] = useState(true);
  const [plLoading, setPlLoading] = useState(false);

  // Dynamic fiscal year — auto-updates on Oct 1 each year
  const [fy] = useState<FiscalYear>(() => getCurrentFiscalYear());

  const [interfastStats, setInterfastStats] = useState<InterfastStats | null>(null);
  const [plCurrentInvoices, setPlCurrentInvoices] = useState<PLInvoice[]>([]);
  const [plCurrentCharges, setPlCurrentCharges] = useState<PLInvoice[]>([]);
  const [plConnected, setPlConnected] = useState(false);
  const [plHistory, setPlHistory] = useState<PLHistoryEntry[]>([]);
  const [objective, setObjective] = useState<FinancialObjective>({ ca_objectif: null, marge_objectif: null });
  const [manualHistory, setManualHistory] = useState<ManualHistoryEntry[]>([]);
  const [editObj, setEditObj] = useState(false);
  const [objInput, setObjInput] = useState("");
  const [showAddHistory, setShowAddHistory] = useState(false);
  const [histForm, setHistForm] = useState(EMPTY_HISTORY_FORM);
  const [saving, setSaving] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, plRes, objRes, manRes] = await Promise.all([
        fetch(`/api/finances/interfast?exercise_start=${fy.start}`),
        fetch(`/api/finances/pennylane/stats?from=${fy.start}&to=${fy.end}`),
        fetch(`/api/finances/objectives?exercise_start=${fy.start}`),
        fetch("/api/finances/history"),
      ]);
      if (iRes.ok) { const d = await iRes.json(); setInterfastStats(d.stats ?? null); }
      if (plRes.ok) {
        const d = await plRes.json();
        setPlConnected(d.connected ?? false);
        setPlCurrentInvoices(d.invoices ?? []);
        setPlCurrentCharges(d.charges ?? []);
      }
      if (objRes.ok) { const d = await objRes.json(); setObjective(d); setObjInput(d.ca_objectif ? String(Math.round(d.ca_objectif)) : ""); }
      if (manRes.ok) { const d = await manRes.json(); setManualHistory(Array.isArray(d) ? d : []); }
    } finally { setLoading(false); }
  }, [fy]);

  const loadHistory = useCallback(async () => {
    if (!plConnected || historyLoaded) return;
    setPlLoading(true);
    try {
      const r = await fetch("/api/finances/pennylane/history?since=2018");
      if (r.ok) { const d = await r.json(); if (d.connected) { setPlHistory(d.history ?? []); setHistoryLoaded(true); } }
    } finally { setPlLoading(false); }
  }, [plConnected, historyLoaded]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === "evolution" || tab === "projection") loadHistory(); }, [tab, loadHistory]);

  async function saveObjective() {
    setSaving(true);
    try {
      const ca = parseFloat(objInput.replace(/\s/g, "").replace(",", "."));
      if (!isNaN(ca)) {
        await fetch("/api/finances/objectives", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exercise_start: fy.start, ca_objectif: ca }),
        });
        setObjective((p) => ({ ...p, ca_objectif: ca }));
      }
    } finally { setSaving(false); setEditObj(false); }
  }

  async function saveManualHistory() {
    setSaving(true);
    try {
      const n = (v: string) => v.trim() ? parseFloat(v.replace(/\s/g, "").replace(",", ".")) || null : null;
      await fetch("/api/finances/history", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise_label: histForm.label, ca_ht: n(histForm.ca),
          masse_salariale: n(histForm.masse_salariale), charges_vehicules: n(histForm.charges_vehicules),
          frais_generaux: n(histForm.frais_generaux), achats_fournitures: n(histForm.achats_fournitures),
          sous_traitance: n(histForm.sous_traitance), charges_totales: n(histForm.charges_totales),
          resultat_net: n(histForm.resultat_net), tresorerie_fin: n(histForm.tresorerie_fin),
          effectif: histForm.effectif ? parseInt(histForm.effectif) : null,
        }),
      });
      setShowAddHistory(false); setHistForm(EMPTY_HISTORY_FORM); load();
    } finally { setSaving(false); }
  }

  // ── Computed ────────────────────────────────────────────────────────────────
  const caReel = interfastStats?.ca_reel ?? 0;
  const caPrev = interfastStats?.ca_previsionnel ?? 0;
  const pipeline = interfastStats?.devis_signes ?? 0;
  const retards = interfastStats?.retards ?? 0;
  const caObj = objective.ca_objectif;
  const objPct = caObj ? Math.min(Math.round((caReel / caObj) * 100), 100) : null;

  const plCurrent = plHistory.find((h) => h.isCurrent) ?? null;
  const plPaid = plCurrentInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amountHT, 0);
  const plPending = plCurrentInvoices.filter((i) => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + i.amountHT, 0);
  const plCaTotal = plCurrentInvoices.reduce((s, i) => s + i.amountHT, 0);

  // Charges fournisseurs depuis Pennylane (supplier invoices V2 — montants absolus)
  const plChargesTotal = plCurrentCharges.reduce((s, i) => s + Math.abs(i.amountHT), 0);
  const plChargesCount = plCurrentCharges.length;
  // Avoirs (montants négatifs) = retours / corrections fournisseurs
  const plAvoirsTotal = plCurrentCharges.filter(i => i.amountHT < 0).reduce((s, i) => s + Math.abs(i.amountHT), 0);
  const plChargesNettes = plChargesTotal - plAvoirsTotal * 2; // net des avoirs déjà inclus en négatif

  // Résultat partiel : CA Interfast (réel) - charges fournisseurs Pennylane
  const resultatPartiel = caReel - plChargesNettes;
  const tauxCharges = caReel > 0 ? (plChargesNettes / caReel) * 100 : 0;

  // Charges par mois (Pennylane)
  const monthlyCharges: Record<string, number> = {};
  for (const inv of plCurrentCharges) {
    const k = inv.date.slice(0, 7);
    monthlyCharges[k] = (monthlyCharges[k] || 0) + Math.abs(inv.amountHT);
  }

  // Top fournisseurs (groupement par label prefix)
  const supplierMap: Record<string, number> = {};
  for (const inv of plCurrentCharges) {
    const name = inv.label.replace(/^(Facture|Avoir)\s+/i, "").replace(/\s+-\s+\d+.*$/, "").trim();
    if (name) supplierMap[name] = (supplierMap[name] || 0) + Math.abs(inv.amountHT);
  }
  const topSuppliers = Object.entries(supplierMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const prevYear = plHistory.find((h) => h.startYear === fy.startYear - 1);
  const caGrowth = delta(caReel, prevYear?.ca_ht ?? null);

  const estimation = (plHistory.length > 0 || manualHistory.length > 0)
    ? computeEstimation(plHistory, manualHistory, interfastStats, plCurrent) : null;

  // ── Monthly data ────────────────────────────────────────────────────────────
  const monthlyCA: Record<string, number> = {};
  for (const inv of plCurrentInvoices) {
    const k = inv.date.slice(0, 7);
    monthlyCA[k] = (monthlyCA[k] || 0) + inv.amountHT;
  }

  const inputStyle: React.CSSProperties = {
    padding: "6px 9px", border: "1px solid var(--border)", borderRadius: 7,
    fontSize: 12, background: "var(--bg)", color: "var(--text)", width: "100%", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 3, fontWeight: 500 };

  const TABS: { id: Tab; label: string }[] = [
    { id: "comptabilite", label: "Comptabilité" },
    { id: "activite", label: "Activité" },
    { id: "evolution", label: "Évolution" },
    { id: "projection", label: "Projection" },
  ];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px 10px" }}>
          <button onClick={() => router.push("/")} className="btn-ghost"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 9px", fontSize: 13 }}>
            <Icon name="chevron" size={13} style={{ transform: "rotate(180deg)" }} />
            Retour
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <h1 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>Pilotage Financier</h1>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Aria Energies</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginTop: 1 }}>
              Exercice {fy.label} · {new Date(fy.start).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })} → {new Date(fy.end).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {plConnected && <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: "#18A99920", color: "#18A999" }}>Pennylane</span>}
            {interfastStats && <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: "#1e40af20", color: "#1e40af" }}>Interfast</span>}
          </div>
        </div>
        <div style={{ display: "flex", paddingLeft: 20, gap: 0 }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "8px 16px", fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? "var(--accent)" : "var(--text-muted)",
              background: "transparent", border: "none", cursor: "pointer",
              borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 60, fontSize: 13 }}>Chargement…</div>
        ) : (

          <>
            {/* ══ COMPTABILITÉ ════════════════════════════════════════════════ */}
            {tab === "comptabilite" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <SourceBadge source="pennylane" />
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Charges fournisseurs Pennylane · CA depuis Interfast · {plChargesCount} factures analysées
                  </span>
                </div>

                {!plConnected ? (
                  <div className="card" style={{ padding: "24px 20px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 8px", color: "var(--text-muted)", fontSize: 14 }}>Pennylane non connecté</p>
                    <p style={{ margin: "0 0 16px", color: "var(--text-muted)", fontSize: 12 }}>Configurez votre token API dans les Paramètres.</p>
                    <button className="btn-primary" onClick={() => router.push("/settings")} style={{ fontSize: 13, padding: "8px 20px" }}>Configurer Pennylane</button>
                  </div>
                ) : (
                  <>
                    {/* Objectif CA */}
                    <div className="card" style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Objectif CA {fy.label}</div>
                          {!editObj && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{caObj ? `${fmt(caObj)} — ${objPct} % atteint` : "Non défini"}</div>}
                        </div>
                        {!editObj ? (
                          <button className="btn-ghost" onClick={() => setEditObj(true)} style={{ fontSize: 12, padding: "4px 10px" }}>
                            {caObj ? "Modifier" : "Définir"}
                          </button>
                        ) : (
                          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                            <input type="number" value={objInput} onChange={(e) => setObjInput(e.target.value)}
                              placeholder="600000" autoFocus style={{ ...inputStyle, width: 120 }}
                              onKeyDown={(e) => e.key === "Enter" && saveObjective()} />
                            <button className="btn-primary" onClick={saveObjective} disabled={saving} style={{ fontSize: 12, padding: "5px 12px" }}>OK</button>
                            <button className="btn-ghost" onClick={() => setEditObj(false)} style={{ fontSize: 12 }}>×</button>
                          </div>
                        )}
                      </div>
                      {caObj && (
                        <>
                          <Bar value={caReel} max={caObj} color={objPct && objPct >= 80 ? "oklch(0.55 0.085 155)" : "var(--accent)"} h={10} />
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
                            <span>0</span>
                            <span style={{ fontWeight: 700, color: "var(--accent)" }}>{objPct} %</span>
                            <span>{fmt(caObj)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Synthèse CEO */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                      <KPI label="CA réalisé HT" value={fmt(caReel)} sub="Source Interfast" color="accent" delta={caGrowth} />
                      <KPI label="Charges fourn. HT" value={fmt(plChargesNettes)} sub={`${plChargesCount} factures Pennylane`} />
                      <KPI label="Résultat partiel" value={fmt(resultatPartiel)}
                        sub="Hors salaires et amortissements"
                        color={resultatPartiel >= 0 ? "green" : "warn"} />
                      <KPI label="Taux de charge" value={tauxCharges > 0 ? `${Math.round(tauxCharges)} %` : "—"}
                        sub="Charges / CA réalisé"
                        color={tauxCharges > 70 ? "warn" : tauxCharges > 0 ? "blue" : undefined} />
                    </div>

                    {/* Solde visuel */}
                    {caReel > 0 && plChargesNettes > 0 && (
                      <div className="card" style={{ padding: "16px 18px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Répartition du CA réalisé</div>
                        <div style={{ display: "flex", height: 32, borderRadius: 10, overflow: "hidden", gap: 2 }}>
                          <div style={{ flex: plChargesNettes, background: "oklch(0.52 0.085 245 / 0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "white" }}>{Math.round(tauxCharges)} % charges</span>
                          </div>
                          <div style={{ flex: Math.max(caReel - plChargesNettes, 0), background: "oklch(0.55 0.085 155 / 0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "white" }}>{Math.round(100 - tauxCharges)} % résultat</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
                          <span>Charges fournisseurs : <strong style={{ color: "var(--text)" }}>{fmt(plChargesNettes)}</strong></span>
                          <span>Résultat partiel : <strong style={{ color: resultatPartiel >= 0 ? "oklch(0.55 0.085 155)" : "oklch(0.52 0.085 245)" }}>{fmt(resultatPartiel)}</strong></span>
                        </div>
                        {plAvoirsTotal > 0 && (
                          <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "8px 0 0" }}>
                            Inclut {fmt(plAvoirsTotal)} d'avoirs fournisseurs déduits
                          </p>
                        )}
                      </div>
                    )}

                    {/* Dépenses mensuelles */}
                    <div className="card" style={{ padding: "16px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>Charges fournisseurs par mois</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Toutes les factures fournisseurs Pennylane</div>
                        </div>
                        <SourceBadge source="pennylane" />
                      </div>
                      <MonthlyBars monthlyCA={monthlyCharges} startYear={fy.startYear} />
                    </div>

                    {/* Top fournisseurs */}
                    {topSuppliers.length > 0 && (
                      <div className="card" style={{ padding: "16px 18px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>Top fournisseurs — exercice {fy.label}</div>
                          <SourceBadge source="pennylane" />
                        </div>
                        {topSuppliers.map(([name, total]) => (
                          <div key={name} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                              <span style={{ color: "var(--text)", maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                              <span>
                                <strong>{fmt(total)}</strong>
                                <span style={{ color: "var(--text-muted)", marginLeft: 5 }}>({Math.round((total / plChargesNettes) * 100)} %)</span>
                              </span>
                            </div>
                            <Bar value={total} max={topSuppliers[0][1]} color="oklch(0.52 0.085 245 / 0.6)" h={5} />
                          </div>
                        ))}
                        <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "10px 0 0" }}>
                          Hors salaires, charges sociales et amortissements — voir onglet Projection pour estimation complète
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ══ ACTIVITÉ ════════════════════════════════════════════════════ */}
            {tab === "activite" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <SourceBadge source="interfast" />
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Pilotage de l'activité — devis, interventions, facturation</span>
                </div>

                {!interfastStats ? (
                  <div className="card" style={{ padding: "24px 20px", textAlign: "center" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Données Interfast non synchronisées — demandez une synchronisation à Aria.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                      <KPI label="CA Réalisé" value={fmt(caReel)} sub="Chantiers facturés HT" color="accent" />
                      <KPI label="CA Prévisionnel" value={fmt(caPrev)} sub="Total exercice estimé" />
                      <KPI label="Reste à facturer" value={fmt(caPrev - caReel)} sub="En cours + prévu" />
                      <KPI label="Pipeline signé" value={fmt(pipeline)} sub="Devis signés, à planifier" color="blue" />
                      <KPI label="Impayés" value={fmt(retards)} sub="Retards de paiement" color={retards > 0 ? "warn" : undefined} />
                      <KPI label="Achats matériaux" value={fmt(interfastStats.achats)} sub="Valeur achats Interfast" />
                    </div>

                    {/* Répartition */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div className="card" style={{ padding: "16px 18px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Répartition du CA réalisé</div>
                        <CostRow label="Main d'œuvre" value={interfastStats.mo_reel} total={caReel} color="var(--accent)" />
                        <CostRow label="Fournitures" value={interfastStats.fournitures_reel} total={caReel} color="oklch(0.52 0.1 295)" />
                        <div style={{ paddingTop: 10, borderTop: "1px solid var(--border)", marginTop: 4 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                            <span style={{ color: "var(--text-muted)" }}>Ratio MO / CA</span>
                            <strong>{pct(interfastStats.mo_reel, caReel)}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="card" style={{ padding: "16px 18px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Indicateurs activité</div>
                        {[
                          { label: "Taux réalisation CA", value: pct(caReel, caPrev) },
                          { label: "Pipeline / CA réalisé", value: pct(pipeline, caReel) },
                          { label: "Impayés / CA réalisé", value: pct(retards, caReel) },
                          { label: "Achats / CA prévisionnel", value: pct(interfastStats.achats, caPrev) },
                          { label: "TVA collectée", value: fmt(interfastStats.tva_reel) },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                            <span style={{ color: "var(--text-muted)" }}>{label}</span>
                            <strong>{value}</strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    {interfastStats.synced_at && (
                      <p style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "right" }}>
                        Dernière synchro Interfast : {new Date(interfastStats.synced_at).toLocaleString("fr-FR")}
                      </p>
                    )}
                  </>
                )}
              </>
            )}

            {/* ══ ÉVOLUTION ════════════════════════════════════════════════════ */}
            {tab === "evolution" && (
              <>
                {/* Pennylane history chart */}
                <div className="card" style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>CA par exercice — depuis 2018</div>
                    <SourceBadge source="pennylane" />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>
                    Factures clients Pennylane — exercices oct → sept
                  </div>
                  {plLoading ? (
                    <div style={{ height: 150, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>
                      Chargement de l'historique Pennylane…
                    </div>
                  ) : plHistory.length > 0 ? (
                    <HistoryBars entries={plHistory.map((h) => ({ label: h.label, ca_ht: h.ca_ht, isCurrent: h.isCurrent }))} />
                  ) : (
                    <div style={{ height: 150, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", borderRadius: 10, color: "var(--text-muted)", fontSize: 12 }}>
                      {plConnected ? "Aucune donnée Pennylane disponible pour cette période" : "Connectez Pennylane pour voir l'historique"}
                    </div>
                  )}
                </div>

                {/* Pennylane detail table */}
                {plHistory.length > 0 && (
                  <div className="card" style={{ padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Détail comptable par exercice</div>
                      <SourceBadge source="pennylane" />
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            <th style={{ textAlign: "left", padding: "0 10px 8px 0" }}>Exercice</th>
                            <th style={{ textAlign: "right", padding: "0 10px 8px" }}>CA HT</th>
                            <th style={{ textAlign: "right", padding: "0 10px 8px" }}>Charges fourn.</th>
                            <th style={{ textAlign: "right", padding: "0 10px 8px" }}>Résultat partiel</th>
                            <th style={{ textAlign: "right", padding: "0 10px 8px" }}>Factures</th>
                            <th style={{ textAlign: "right", padding: "0 0 8px 10px" }}>Évolution CA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plHistory.map((h, i) => {
                            const prev = i > 0 ? plHistory[i - 1] : null;
                            const d = delta(h.ca_ht, prev?.ca_ht ?? null);
                            return (
                              <tr key={h.label} style={{ borderTop: "1px solid var(--border)", background: h.isCurrent ? "var(--accent-soft)" : "transparent" }}>
                                <td style={{ padding: "9px 10px 9px 0", fontWeight: h.isCurrent ? 700 : 500, color: h.isCurrent ? "var(--accent)" : "var(--text)" }}>
                                  {h.label}{h.isCurrent ? " *" : ""}
                                </td>
                                <td style={{ textAlign: "right", padding: "9px 10px", fontWeight: 600 }}>{h.ca_ht > 0 ? fmt(h.ca_ht) : "—"}</td>
                                <td style={{ textAlign: "right", padding: "9px 10px", color: "var(--text-muted)" }}>{h.charges_fournisseurs > 0 ? fmt(h.charges_fournisseurs) : "—"}</td>
                                <td style={{ textAlign: "right", padding: "9px 10px", fontWeight: 600, color: h.resultat_partiel >= 0 ? "oklch(0.55 0.085 155)" : "oklch(0.52 0.085 245)" }}>
                                  {h.ca_ht > 0 ? fmt(h.resultat_partiel) : "—"}
                                </td>
                                <td style={{ textAlign: "right", padding: "9px 10px", color: "var(--text-muted)" }}>{h.invoice_count || "—"}</td>
                                <td style={{ textAlign: "right", padding: "9px 0 9px 10px" }}>
                                  {d ? <span style={{ fontWeight: 600, color: d.positive ? "oklch(0.55 0.085 155)" : "oklch(0.52 0.085 245)" }}>{d.value}</span> : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "8px 0 0" }}>
                      * En cours · Résultat partiel = CA - charges fournisseurs (hors salaires et amortissements)
                    </p>
                  </div>
                )}

                {/* Manual history (bilans complets) */}
                <div className="card" style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Bilans complets</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Données issues de vos bilans annuels (salaires, résultat net, trésorerie)</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <SourceBadge source="manual" />
                      <button className="btn-ghost" onClick={() => setShowAddHistory((v) => !v)} style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}>
                        <Icon name="plus" size={12} /> Ajouter
                      </button>
                    </div>
                  </div>

                  {showAddHistory && (
                    <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                        {[
                          { key: "label", label: "Exercice *", placeholder: "2024-2025" },
                          { key: "ca", label: "CA HT (€)", placeholder: "450000" },
                          { key: "masse_salariale", label: "Masse salariale (€)", placeholder: "180000" },
                          { key: "charges_vehicules", label: "Frais véhicules (€)", placeholder: "25000" },
                          { key: "frais_generaux", label: "Frais généraux (€)", placeholder: "40000" },
                          { key: "achats_fournitures", label: "Achats/fournitures (€)", placeholder: "200000" },
                          { key: "sous_traitance", label: "Sous-traitance (€)", placeholder: "0" },
                          { key: "charges_totales", label: "Total charges (€)", placeholder: "420000" },
                          { key: "resultat_net", label: "Résultat net (€)", placeholder: "35000" },
                          { key: "tresorerie_fin", label: "Trésorerie fin ex. (€)", placeholder: "50000" },
                          { key: "effectif", label: "Effectif (ETP)", placeholder: "8" },
                        ].map(({ key, label, placeholder }) => (
                          <div key={key}>
                            <label style={labelStyle}>{label}</label>
                            <input value={(histForm as Record<string, string>)[key]} placeholder={placeholder}
                              type={key === "label" ? "text" : "number"}
                              onChange={(e) => setHistForm((p) => ({ ...p, [key]: e.target.value }))}
                              style={inputStyle} />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn-primary" onClick={saveManualHistory} disabled={saving || !histForm.label} style={{ fontSize: 12, padding: "7px 16px" }}>
                          {saving ? "…" : "Enregistrer"}
                        </button>
                        <button className="btn-ghost" onClick={() => setShowAddHistory(false)} style={{ fontSize: 12 }}>Annuler</button>
                      </div>
                    </div>
                  )}

                  {manualHistory.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      Aucun bilan saisi — ajoutez vos exercices depuis 2018 pour enrichir les projections.
                    </p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {["Exercice", "CA HT", "Masse sal.", "Véhicules", "Frais gén.", "Total charges", "Résultat net", "Trésorerie", "ETP"].map((h) => (
                              <th key={h} style={{ textAlign: h === "Exercice" ? "left" : "right", padding: "0 8px 8px", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {manualHistory.map((h) => (
                            <tr key={h.exercise_start} style={{ borderTop: "1px solid var(--border)" }}>
                              <td style={{ padding: "8px 8px 8px 0", fontWeight: 600 }}>{h.exercise_label}</td>
                              <td style={{ textAlign: "right", padding: "8px", fontWeight: 600 }}>{fmt(h.ca_ht)}</td>
                              <td style={{ textAlign: "right", padding: "8px", color: "var(--text-muted)" }}>{fmt(h.masse_salariale)}</td>
                              <td style={{ textAlign: "right", padding: "8px", color: "var(--text-muted)" }}>{fmt(h.charges_vehicules)}</td>
                              <td style={{ textAlign: "right", padding: "8px", color: "var(--text-muted)" }}>{fmt(h.frais_generaux)}</td>
                              <td style={{ textAlign: "right", padding: "8px", color: "var(--text-muted)" }}>{fmt(h.charges_totales)}</td>
                              <td style={{ textAlign: "right", padding: "8px", fontWeight: 600, color: (h.resultat_net ?? 0) >= 0 ? "oklch(0.55 0.085 155)" : "oklch(0.52 0.085 245)" }}>
                                {fmt(h.resultat_net)}
                              </td>
                              <td style={{ textAlign: "right", padding: "8px" }}>{fmt(h.tresorerie_fin)}</td>
                              <td style={{ textAlign: "right", padding: "8px 0" }}>{h.effectif ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ══ PROJECTION ══════════════════════════════════════════════════ */}
            {tab === "projection" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: "var(--accent-soft)", color: "var(--accent)" }}>Estimation</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Projection résultat exercice {fy.label} · basée sur historique + données temps réel</span>
                </div>

                {plLoading ? (
                  <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Chargement de l'historique…</div>
                ) : estimation ? (
                  <>
                    {/* Méthodologie */}
                    <div style={{ padding: "10px 14px", background: "var(--accent-soft)", borderRadius: 10, fontSize: 12, color: "var(--text-muted)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}>
                      <strong style={{ color: "var(--accent)" }}>Méthode :</strong> Projection basée sur {estimation.dataPoints} exercice(s) complet(s).
                      Ratio charges fournisseurs historique : {Math.round(estimation.avgChargeRatio * 100)} % du CA.
                      {estimation.avgSalaryRatio ? ` Ratio masse salariale : ${Math.round(estimation.avgSalaryRatio * 100)} %.` : " Masse salariale : renseignez vos bilans historiques pour affiner."}
                    </div>

                    {/* CA projeté */}
                    <div className="card" style={{ padding: "14px 18px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Base de projection — CA exercice {fy.label}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                        <div style={{ padding: "12px 14px", background: "var(--surface-2)", borderRadius: 10 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 4 }}>CA prévisionnel</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--accent)" }}>{fmt(caPrev)}</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Source Interfast</div>
                        </div>
                        <div style={{ padding: "12px 14px", background: "var(--surface-2)", borderRadius: 10 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 4 }}>CA facturé YTD</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{fmt(plCaTotal || caReel)}</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Source {plConnected ? "Pennylane" : "Interfast"}</div>
                        </div>
                        <div style={{ padding: "12px 14px", background: "var(--surface-2)", borderRadius: 10 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 4 }}>Reste à facturer</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{fmt(caPrev - (plCaTotal || caReel))}</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Prévisionnel - facturé</div>
                        </div>
                      </div>
                    </div>

                    {/* 3 scénarios */}
                    <div className="card" style={{ padding: "14px 18px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Estimation du résultat — 3 scénarios</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                        {[
                          { label: "Prudent", value: estimation.prudent, desc: "Ratio charges le plus élevé de l'historique", color: "oklch(0.52 0.085 245)" },
                          { label: "Réaliste", value: estimation.realiste, desc: "Ratio moyen des 3 derniers exercices", color: "var(--accent)" },
                          { label: "Optimiste", value: estimation.optimiste, desc: "Ratio charges le plus faible de l'historique", color: "oklch(0.55 0.085 155)" },
                        ].map(({ label, value, desc, color }) => (
                          <div key={label} style={{ padding: "14px 16px", background: "var(--surface-2)", borderRadius: 12, border: label === "Réaliste" ? "2px solid var(--accent)" : "1px solid var(--border)" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color, marginBottom: 6 }}>{label}</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color }}>{fmt(value)}</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{desc}</div>
                          </div>
                        ))}
                      </div>

                      {estimation.estimatedSalaries && (
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: "var(--text)" }}>Détail estimé (scénario réaliste)</div>
                          {[
                            { label: "CA prévisionnel", value: caPrev, color: "oklch(0.55 0.085 155)" },
                            { label: "- Charges fournisseurs estimées", value: -estimation.estimatedCharges, color: "var(--text)" },
                            { label: "- Masse salariale estimée", value: -estimation.estimatedSalaries, color: "var(--text)" },
                            { label: "= Résultat net estimé", value: estimation.estimatedResultNet, color: (estimation.estimatedResultNet ?? 0) >= 0 ? "oklch(0.55 0.085 155)" : "oklch(0.52 0.085 245)" },
                          ].map(({ label, value, color }) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                              <span style={{ color: "var(--text-muted)" }}>{label}</span>
                              <strong style={{ color }}>{fmt(value)}</strong>
                            </div>
                          ))}
                        </div>
                      )}

                      {!estimation.estimatedSalaries && (
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12, padding: "8px 10px", background: "var(--surface-2)", borderRadius: 8 }}>
                          Pour affiner la projection avec la masse salariale, ajoutez vos bilans historiques dans l'onglet Évolution.
                        </p>
                      )}
                    </div>

                    {/* Prochaine transition */}
                    <div className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon name="calendar" size={16} style={{ color: "var(--accent)" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                          Prochain changement d'exercice : 1er octobre {fy.startYear + 1}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                          À cette date, le dashboard basculera automatiquement sur l'exercice {fy.startYear + 1}-{fy.startYear + 2}.
                          L'exercice {fy.label} passera dans l'historique.
                        </div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {Math.ceil((new Date(`${fy.startYear + 1}-10-01`).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} jours
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="card" style={{ padding: "32px 20px", textAlign: "center" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 8 }}>Données insuffisantes pour une projection</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      Connectez Pennylane ou ajoutez des bilans historiques dans l'onglet Évolution.
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
