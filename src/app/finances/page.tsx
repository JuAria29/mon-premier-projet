"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icons";
import { PageGuard } from "@/components/ui/PageGuard";
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
  // Pipeline devis
  devis_signes_count?: number;
  devis_envoyes_count?: number;
  devis_envoyes_total?: number;
  devis_refuses_count?: number;
  devis_previsionnel_total?: number;
  devis_reel_total?: number;
  // Chantiers
  chantiers_non_demarre?: number;
  chantiers_en_cours?: number;
  chantiers_termines?: number;
  // Brouillons
  brouillons_count?: number;
  brouillons_total?: number;
  brouillons_oldest_days?: number;
  brouillons_items?: Array<{ label: string; client: string; montant_ht: number; created_at: string; days: number }>;
  // Activités
  ca_reel_maintenance?: number;
  ca_prev_maintenance?: number;
  mo_reel_maintenance?: number;
  fournitures_reel_maintenance?: number;
  devis_signes_maintenance?: number;
  retards_maintenance?: number;
  // Devis à faire suite à intervention
  devis_a_faire_count?: number;
  devis_a_faire_total?: number;
  devis_a_faire_items?: Array<{ label: string; client: string; montant_ht: number; intervention_date: string; days_since: number }>;
}

interface PLInvoice {
  id: string; date: string; amountHT: number; amountTTC: number;
  status: string; customerName: string | null; label: string;
}

interface PLHistoryEntry {
  startYear: number; label: string; start: string; end: string; isCurrent: boolean;
  ca_ht: number; charges_fournisseurs: number; resultat_partiel: number;
  invoice_count: number; charge_count: number;
  monthly_ca?: Record<string, number>;
  monthly_charges?: Record<string, number>;
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

type Tab = "synthese" | "commercial" | "finance";
type PoleFilter = "tous" | "maintenance" | "travaux";

// ─── Catégorisation des charges fournisseurs ──────────────────────────────────

type ChargeCategory = "Matériaux & Achats" | "Carburant" | "Véhicules" | "Assurances" | "Sous-traitance" | "Énergie & Télécom" | "Taxes & cotisations" | "Frais généraux";

const CATEGORY_COLORS: Record<ChargeCategory, string> = {
  "Matériaux & Achats":  "var(--accent)",
  "Carburant":           "oklch(0.62 0.12 55)",
  "Véhicules":           "oklch(0.52 0.085 245)",
  "Assurances":          "oklch(0.52 0.1 295)",
  "Sous-traitance":      "oklch(0.55 0.085 155)",
  "Énergie & Télécom":   "oklch(0.52 0.085 200)",
  "Taxes & cotisations": "oklch(0.55 0.08 30)",
  "Frais généraux":      "oklch(0.6 0.02 60)",
};

function extractSupplierName(label: string): string {
  return label
    .replace(/^(Facture|Avoir|Note de débit|Note de crédit)\s+/i, "")
    .replace(/\s+-\s+[\w\d]+.*$/, "")
    .trim()
    .toUpperCase();
}

function categorizeCharge(label: string): ChargeCategory {
  const n = extractSupplierName(label);

  if (/CARBURANT|ESSENCE|GASOIL|DIESEL|STATION|TOTAL\s*(ENER|ACCES)|BP\s|SHELL|Q8\b|ESSO|DYNEFF|LECLERC\s*DRIVE/.test(n))
    return "Carburant";

  if (/ASSUR|AXA|MAIF|ALLIANZ|GENERALI|MMA\b|GMF\b|MATMUT|GROUPAMA|COVEA|SMABTP|APRIL|AREAS/.test(n))
    return "Assurances";

  if (/GARAGE|PNEU|PNEUM|LEASING|LOA\b|LLD\b|RENAULT|PEUGEOT|CITROEN|VOLKSWAGEN|VW\b|FORD\b|TOYOTA|MERCEDES|OPEL|FIAT|AUTOMAT|SECURITEST|CT AUTO|CONTROLE TECH|SPEEDY|NORAUTO|MIDAS|EUROMASTER|BOSCH CAR/.test(n))
    return "Véhicules";

  if (/REXEL|LEGRAND|SCHNEIDER|GRDF|EDF\b|ENEDIS|ELECTRI|EAU\b|VEOLIA|SUEZ|ORANGE|SFR\b|BOUYGUE|FREE\b|NUMERICABLE|OVH|IONOS|SCALEWAY|NETLIFI/.test(n))
    return "Énergie & Télécom";

  if (/LEROY.MERLIN|CASTORAMA|BRICOMAN|POINT.P|BMATERIAL|SOCODA|REXEL|PROLIANS|WÜRTH|WURTH|SONEPAR|QUINCAILLER|BRICOMARCHE|BRICO.DEPOT|CSTB|EDILIANS|KNAUF|ISOVER|DOMOPLUS|ESPACE.EMERAUDE/.test(n))
    return "Matériaux & Achats";

  if (/SOUS.TRAIT|INTERIM|MANPOWER|ADECCO|RANDSTAD|SYNERGIE|PROMAN|PRESTATION|ARTISAN|ELECTRICIEN|PLOMBIER|POSEUR|INSTALLATEUR/.test(n))
    return "Sous-traitance";

  if (/URSSAF|IMPOT|TRESOR|DGI|SIE\b|TAXE|CFE\b|TVS\b|AGEFIPH|RSI\b|CIPAV|CMA\b|CCI\b|CHAMBRE|CONTRIBUTION/.test(n))
    return "Taxes & cotisations";

  return "Frais généraux";
}

interface CategorySummary {
  category: ChargeCategory;
  total: number;
  count: number;
  items: Array<{ label: string; supplier: string; amountHT: number; date: string }>;
}

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

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ fontSize: 10, width: 15, height: 15, borderRadius: "50%", border: "1.5px solid var(--text-muted)", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "default", lineHeight: 1, fontWeight: 700, userSelect: "none", flexShrink: 0 }}
      >i</span>
      {show && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "oklch(0.22 0.012 60)", color: "#fff", fontSize: 12, lineHeight: 1.6, padding: "10px 14px", borderRadius: 10, width: 250, zIndex: 200, whiteSpace: "pre-wrap", boxShadow: "0 6px 24px rgba(0,0,0,0.3)", pointerEvents: "none", fontWeight: 400 }}>
          {text}
        </div>
      )}
    </span>
  );
}

function KPI({ label, value, sub, color, delta: d, tooltip }: {
  label: string; value: string; sub?: string; tooltip?: string;
  color?: "accent" | "green" | "blue" | "warn"; delta?: { value: string; positive: boolean } | null;
}) {
  const c = color === "accent" ? "var(--accent)" : color === "green" ? "oklch(0.55 0.085 155)"
    : color === "blue" ? "oklch(0.52 0.085 245)" : color === "warn" ? "oklch(0.52 0.085 245)" : "var(--text)";
  return (
    <div className="card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </div>
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

function CategoryCard({ cat, color, pctOfTotal, totalCharges, topSuppliers }: {
  cat: CategorySummary; color: string; pctOfTotal: number;
  totalCharges: number; topSuppliers: [string, number][];
}) {
  const [open, setOpen] = useState(false);
  // Top suppliers in this category
  const catSuppliers = topSuppliers
    .filter(([name]) => cat.items.some((i) => i.supplier === name || i.label.toUpperCase().includes(name)))
    .slice(0, 4);

  return (
    <div className="card" style={{ padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, cursor: "pointer" }}
        onClick={() => setOpen((v) => !v)}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{cat.category}</span>
            <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{cat.count} factures</span>
              <span style={{ fontSize: 15, fontWeight: 800, color }}>{fmt(cat.total)}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>{Math.round(pctOfTotal)} %</span>
            </div>
          </div>
          <div style={{ marginTop: 6 }}>
            <Bar value={cat.total} max={totalCharges} color={color} h={5} />
          </div>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 4 }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 2 }}>
          {cat.items.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0",
              borderBottom: i < cat.items.length - 1 ? "1px solid var(--border)" : "none", fontSize: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>
                  {item.supplier || item.label}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{item.date}</div>
              </div>
              <strong style={{ flexShrink: 0, marginLeft: 12 }}>{fmt(item.amountHT)}</strong>
            </div>
          ))}
          {cat.count > 5 && (
            <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "6px 0 0" }}>
              + {cat.count - 5} autres factures dans cette catégorie
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
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

function FinancesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    return (t === "commercial" || t === "synthese") ? t : "synthese";
  });
  const [poleFilter, setPoleFilter] = useState<PoleFilter>("tous");
  const [brouillonsOpen, setBrouillonsOpen] = useState(false);
  const [devisAFaireOpen, setDevisAFaireOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plLoading, setPlLoading] = useState(false);

  // Dynamic fiscal year — auto-updates on Oct 1 each year
  const [fy] = useState<FiscalYear>(() => getCurrentFiscalYear());

  // Scroll vers la section demandée via le param URL ?section=xxx
  useEffect(() => {
    const section = searchParams.get("section");
    if (!section) return;
    const id = `section-${section}`;
    const attempt = (tries: number) => {
      const el = document.getElementById(id);
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      if (tries > 0) setTimeout(() => attempt(tries - 1), 300);
    };
    setTimeout(() => attempt(5), 400);
  }, [searchParams, tab]);

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
  useEffect(() => { if (tab === "finance") loadHistory(); }, [tab, loadHistory]);

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

  // Pipeline devis
  const devisEnvoyesCount = interfastStats?.devis_envoyes_count ?? 0;
  const devisEnvoyesTotal = interfastStats?.devis_envoyes_total ?? 0;
  const devisSignesCount = interfastStats?.devis_signes_count ?? 0;
  const devisRefusesCount = interfastStats?.devis_refuses_count ?? 0;
  const devisDecides = devisSignesCount + devisRefusesCount; // devis avec décision finale
  const tauxTransformation = devisDecides > 0 ? Math.round((devisSignesCount / devisDecides) * 100) : null;
  const chantiersNonDemarre = interfastStats?.chantiers_non_demarre ?? 0;
  const chantiersEnCours = interfastStats?.chantiers_en_cours ?? 0;
  const chantiersTermines = interfastStats?.chantiers_termines ?? 0;
  const chantiersTotal = chantiersNonDemarre + chantiersEnCours + chantiersTermines;
  const objPct = caObj ? Math.min(Math.round((caReel / caObj) * 100), 100) : null;

  // Brouillons
  const brouillonsCount = interfastStats?.brouillons_count ?? 0;
  const brouillonsTotal = interfastStats?.brouillons_total ?? 0;
  const brouillonsOldestDays = interfastStats?.brouillons_oldest_days ?? 0;
  const brouillonsItems = interfastStats?.brouillons_items ?? [];

  // Devis à faire suite à intervention
  const devisAFaireCount = interfastStats?.devis_a_faire_count ?? 0;
  const devisAFaireTotal = interfastStats?.devis_a_faire_total ?? 0;
  const devisAFaireItems = interfastStats?.devis_a_faire_items ?? [];

  // Taux global : signés / (signés + refusés + en attente)
  const totalDevisVersClients = devisSignesCount + devisRefusesCount + devisEnvoyesCount;
  const tauxConversionGlobal = totalDevisVersClients > 0
    ? Math.round((devisSignesCount / totalDevisVersClients) * 100) : null;

  // CA potentiel perdu (refusés × valeur moyenne des devis décidés)
  const avgDevisHT = (devisEnvoyesCount + devisSignesCount) > 0
    ? (devisEnvoyesTotal + pipeline) / (devisEnvoyesCount + devisSignesCount) : 0;
  const caPerduesEstimate = avgDevisHT * devisRefusesCount;

  // Pôles d'activité — données brutes
  const caReelMaintenance = interfastStats?.ca_reel_maintenance ?? 0;
  const caPrevMaintenance = interfastStats?.ca_prev_maintenance ?? 0;
  const moReelMaintenance = interfastStats?.mo_reel_maintenance ?? 0;
  const fournituresReelMaintenance = interfastStats?.fournitures_reel_maintenance ?? 0;
  const devisSignesMaintenance = interfastStats?.devis_signes_maintenance ?? 0;
  const retardsMaintenance = interfastStats?.retards_maintenance ?? 0;
  const caReelTravaux = Math.max(caReel - caReelMaintenance, 0);
  const caPrevTravaux = Math.max(caPrev - caPrevMaintenance, 0);
  const moReelTravaux = Math.max((interfastStats?.mo_reel ?? 0) - moReelMaintenance, 0);
  const fournituresReelTravaux = Math.max((interfastStats?.fournitures_reel ?? 0) - fournituresReelMaintenance, 0);
  const devisSignesTravaux = Math.max(pipeline - devisSignesMaintenance, 0);
  const retardsTravaux = Math.max(retards - retardsMaintenance, 0);
  const caMaintenancePct = caReel > 0 ? Math.round((caReelMaintenance / caReel) * 100) : 0;
  const caTravauxPct = caReel > 0 ? 100 - caMaintenancePct : 0;
  const hasPoleData = caReelMaintenance > 0;

  // Valeurs filtrées par pôle sélectionné
  const filteredCaReel = poleFilter === "maintenance" ? caReelMaintenance : poleFilter === "travaux" ? caReelTravaux : caReel;
  const filteredCaPrev = poleFilter === "maintenance" ? caPrevMaintenance : poleFilter === "travaux" ? caPrevTravaux : caPrev;
  const filteredPipeline = poleFilter === "maintenance" ? devisSignesMaintenance : poleFilter === "travaux" ? devisSignesTravaux : pipeline;
  const filteredRetards = poleFilter === "maintenance" ? retardsMaintenance : poleFilter === "travaux" ? retardsTravaux : retards;
  const filteredMo = poleFilter === "maintenance" ? moReelMaintenance : poleFilter === "travaux" ? moReelTravaux : (interfastStats?.mo_reel ?? 0);
  const filteredFournitures = poleFilter === "maintenance" ? fournituresReelMaintenance : poleFilter === "travaux" ? fournituresReelTravaux : (interfastStats?.fournitures_reel ?? 0);

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

  // Catégories de charges
  const categoryMap: Record<string, CategorySummary> = {};
  for (const inv of plCurrentCharges) {
    const cat = categorizeCharge(inv.label);
    if (!categoryMap[cat]) categoryMap[cat] = { category: cat, total: 0, count: 0, items: [] };
    const amt = Math.abs(inv.amountHT);
    categoryMap[cat].total += amt;
    categoryMap[cat].count += 1;
    if (categoryMap[cat].items.length < 5) {
      categoryMap[cat].items.push({ label: inv.label, supplier: extractSupplierName(inv.label), amountHT: amt, date: inv.date });
    }
  }
  const categories: CategorySummary[] = Object.values(categoryMap).sort((a, b) => b.total - a.total);

  // Top fournisseurs
  const supplierMap: Record<string, number> = {};
  for (const inv of plCurrentCharges) {
    const name = extractSupplierName(inv.label);
    if (name) supplierMap[name] = (supplierMap[name] || 0) + Math.abs(inv.amountHT);
  }
  const topSuppliers = Object.entries(supplierMap).sort(([, a], [, b]) => b - a).slice(0, 8);

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
    { id: "synthese", label: "Synthèse" },
    { id: "commercial", label: "Commercial" },
    { id: "finance", label: "Finance" },
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
            {/* ══ SYNTHÈSE ════════════════════════════════════════════════════ */}
            {tab === "synthese" && (
              <>
                {/* Sources actives */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {interfastStats && <SourceBadge source="interfast" />}
                  {plConnected && <SourceBadge source="pennylane" />}
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Vue consolidée · Exercice {fy.label}
                  </span>
                </div>

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

                {/* KPIs principaux */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  <KPI label="CA Facturé HT"
                    tooltip="Chiffre d'affaires effectivement facturé à ce jour sur l'exercice — chantiers terminés et facturés. C'est ce qui a réellement été encaissé. Source : Interfast."
                    value={fmt(caReel)} sub="Facturé à ce jour" color="accent" delta={caGrowth} />
                  <KPI label="CA Projeté HT"
                    tooltip="Estimation du CA total sur l'ensemble de l'exercice : inclut le CA déjà facturé + chantiers en cours + devis signés à planifier. Recalculé à chaque synchro Interfast."
                    value={fmt(caPrev)} sub="Facturé + en cours + prévu" />
                  <KPI label="Reste à facturer"
                    tooltip="Différence entre le CA projeté et le CA déjà facturé. Représente ce qui sera encore facturé d'ici la fin de l'exercice si tous les chantiers planifiés aboutissent."
                    value={fmt(Math.max(caPrev - caReel, 0))} sub="Projeté − facturé" />
                </div>

                {/* Commercial + Finance côte à côte */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

                  {/* Bloc Commercial */}
                  <div className="card" style={{ padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Commercial</div>
                      <SourceBadge source="interfast" />
                    </div>
                    {interfastStats ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {/* Taux de transformation */}
                        {tauxTransformation !== null && (
                          <div style={{ padding: "10px 12px", background: "var(--accent-soft)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <span style={{ fontSize: 12, color: "var(--text)" }}>Taux de transformation</span>
                              <Tooltip text={`${devisSignesCount} devis signés sur ${devisDecides} décidés (signés + refusés). Les ${devisEnvoyesCount - devisDecides} autres sont encore en attente.`} />
                            </div>
                            <span style={{ fontSize: 22, fontWeight: 800, color: tauxTransformation >= 30 ? "oklch(0.55 0.085 155)" : "var(--accent)" }}>{tauxTransformation} %</span>
                          </div>
                        )}
                        {[
                          { label: "Carnet de commandes", value: fmt(pipeline), sub: devisSignesCount > 0 ? `${devisSignesCount} devis signés` : undefined },
                          { label: "Devis envoyés", value: devisEnvoyesCount > 0 ? `${devisEnvoyesCount} devis` : "—", sub: devisEnvoyesTotal > 0 ? fmt(devisEnvoyesTotal) : undefined },
                          { label: "Impayés", value: fmt(retards), alert: retards > 0 },
                        ].map(({ label, value, sub, alert }) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 12, padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                            <span style={{ color: "var(--text-muted)" }}>{label}</span>
                            <div style={{ textAlign: "right" }}>
                              <strong style={{ color: alert ? "oklch(0.52 0.085 245)" : "var(--text)" }}>{value}</strong>
                              {sub && <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{sub}</div>}
                            </div>
                          </div>
                        ))}
                        {chantiersTotal > 0 && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                            {[
                              { label: `${chantiersNonDemarre} à démarrer`, color: "oklch(0.52 0.085 245)" },
                              { label: `${chantiersEnCours} en cours`, color: "var(--accent)" },
                              { label: `${chantiersTermines} terminés`, color: "oklch(0.55 0.085 155)" },
                            ].map(({ label, color }) => (
                              <span key={label} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: `${color}20`, color }}>{label}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: 12 }}>Données non synchronisées — demandez une synchro à Aria.</p>
                    )}
                  </div>

                  {/* Bloc Finance */}
                  <div className="card" style={{ padding: "16px 18px", opacity: plConnected ? 1 : 0.75 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Finance</div>
                      <SourceBadge source="pennylane" />
                    </div>
                    {plConnected ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {caReel > 0 && plChargesNettes > 0 && (
                          <div style={{ padding: "10px 12px", background: resultatPartiel >= 0 ? "oklch(0.55 0.085 155 / 0.1)" : "oklch(0.52 0.085 245 / 0.1)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <span style={{ fontSize: 12, color: "var(--text)" }}>Résultat partiel</span>
                              <Tooltip text="CA réalisé moins les charges fournisseurs Pennylane. Avant salaires, charges sociales et amortissements." />
                            </div>
                            <span style={{ fontSize: 22, fontWeight: 800, color: resultatPartiel >= 0 ? "oklch(0.55 0.085 155)" : "oklch(0.52 0.085 245)" }}>{fmt(resultatPartiel)}</span>
                          </div>
                        )}
                        {[
                          { label: "Charges fournisseurs", value: fmt(plChargesNettes), sub: `${plChargesCount} factures` },
                          { label: "Taux de charge", value: tauxCharges > 0 ? `${Math.round(tauxCharges)} %` : "—", alert: tauxCharges > 70 },
                        ].map(({ label, value, sub, alert }) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 12, padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                            <span style={{ color: "var(--text-muted)" }}>{label}</span>
                            <div style={{ textAlign: "right" }}>
                              <strong style={{ color: alert ? "oklch(0.52 0.085 245)" : "var(--text)" }}>{value}</strong>
                              {sub && <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{sub}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "20px 0" }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 18 }}>🔒</span>
                        </div>
                        <p style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", margin: 0 }}>
                          Pennylane non connecté<br />
                          <span style={{ fontSize: 11 }}>Charges comptables indisponibles</span>
                        </p>
                        <button className="btn-ghost" onClick={() => router.push("/settings")} style={{ fontSize: 11, padding: "4px 10px" }}>Configurer →</button>
                      </div>
                    )}
                  </div>
                </div>

                {interfastStats?.synced_at && (
                  <p style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "right" }}>
                    Dernière synchro Interfast : {new Date(interfastStats.synced_at).toLocaleString("fr-FR")}
                  </p>
                )}
              </>
            )}

            {/* ══ FINANCE (Pennylane) ══════════════════════════════════════════ */}
            {tab === "finance" && (
              <>
                {!plConnected ? (
                  <div className="card" style={{ padding: "48px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>📊</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Finance — Pennylane</div>
                      <p style={{ margin: "0 0 4px", color: "var(--text-muted)", fontSize: 13 }}>Connectez votre compte Pennylane pour accéder à la comptabilité fournisseurs.</p>
                      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 12 }}>Charges par catégorie, évolution historique et projection de résultat.</p>
                    </div>
                    <button className="btn-primary" onClick={() => router.push("/settings")} style={{ fontSize: 13, padding: "9px 22px" }}>Configurer Pennylane →</button>
                  </div>
                ) : (
                  <>
                    {/* KPIs Finance — données Pennylane uniquement */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                      <KPI label="Charges fourn. HT"
                        tooltip="Total des factures fournisseurs enregistrées dans Pennylane sur l'exercice (carburant, matériaux, assurances, sous-traitance…). Hors salaires et charges sociales."
                        value={fmt(plChargesNettes)} sub={`${plChargesCount} factures analysées`} color="accent" />
                      <KPI label="Résultat partiel"
                        tooltip="CA réalisé (Interfast) moins les charges fournisseurs Pennylane. Résultat avant salaires, charges sociales et amortissements — donc supérieur au résultat net final."
                        value={fmt(resultatPartiel)}
                        sub="CA Interfast − charges Pennylane"
                        color={resultatPartiel >= 0 ? "green" : "warn"} />
                      <KPI label="Taux de charge"
                        tooltip="Part des charges fournisseurs dans le CA réalisé. En dessous de 60 % = bonne maîtrise. Au-delà de 70 %, vigilance recommandée."
                        value={tauxCharges > 0 ? `${Math.round(tauxCharges)} %` : "—"}
                        sub="Charges Pennylane / CA Interfast"
                        color={tauxCharges > 70 ? "warn" : tauxCharges > 0 ? "blue" : undefined} />
                      {plAvoirsTotal > 0 ? (
                        <KPI label="Avoirs déduits"
                          tooltip="Montant des avoirs fournisseurs reçus sur l'exercice, déjà déduits du total des charges. Représente des retours ou corrections de facturation fournisseur."
                          value={fmt(plAvoirsTotal)} sub="Retours / corrections fourn." />
                      ) : (
                        <KPI label="Factures analysées"
                          tooltip="Nombre total de factures fournisseurs importées depuis Pennylane pour cet exercice fiscal (oct. → sept.)."
                          value={`${plChargesCount}`} sub="Fournisseurs Pennylane" />
                      )}
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

                    {/* Breakdown par catégorie */}
                    {categories.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {/* Salaires — hors Pennylane */}
                        <div className="card" style={{ padding: "14px 18px", opacity: 0.7, borderStyle: "dashed" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Salaires & Charges sociales</div>
                              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Non disponible via Pennylane — à saisir dans la section Historique ci-dessous</div>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: "var(--surface-2)", color: "var(--text-muted)" }}>Hors Pennylane</span>
                          </div>
                        </div>

                        {categories.map((cat) => {
                          const color = CATEGORY_COLORS[cat.category];
                          const pctOfTotal = plChargesNettes > 0 ? (cat.total / plChargesNettes) * 100 : 0;
                          return (
                            <CategoryCard
                              key={cat.category}
                              cat={cat}
                              color={color}
                              pctOfTotal={pctOfTotal}
                              totalCharges={plChargesNettes}
                              topSuppliers={topSuppliers}
                            />
                          );
                        })}

                        <p style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", padding: "4px 0" }}>
                          Catégorisation automatique basée sur les libellés Pennylane · {plChargesCount} factures · {fmt(plChargesNettes)} HT
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ══ COMMERCIAL (Interfast) ══════════════════════════════════════ */}
            {tab === "commercial" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <SourceBadge source="interfast" />
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Activité commerciale · Interfast · Exercice {fy.label}</span>
                </div>

                {!interfastStats ? (
                  <div className="card" style={{ padding: "24px 20px", textAlign: "center" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Données Interfast non synchronisées — demandez une synchronisation à Aria.</p>
                  </div>
                ) : (
                  <>
                    {/* ── SECTION 1 : Alertes & Actions ────────────────────────────── */}
                    {(brouillonsCount > 0 || devisAFaireCount > 0) && (
                      <>
                        <div id="section-alertes" />
                        <SectionLabel label="Alertes & Actions" />

                        {/* Brouillons — collapsible */}
                        {brouillonsCount > 0 && (
                          <div className="card" style={{ padding: 0, overflow: "hidden", borderLeft: `3px solid ${brouillonsOldestDays >= 30 ? "oklch(0.52 0.085 245)" : "var(--accent)"}` }}>
                            <button onClick={() => setBrouillonsOpen((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                                  Devis en brouillon{" "}
                                  <span style={{ fontSize: 12, fontWeight: 500, color: brouillonsOldestDays >= 30 ? "oklch(0.52 0.085 245)" : "var(--accent)" }}>· {brouillonsCount} non envoyés</span>
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                                  {fmt(brouillonsTotal)} HT de CA potentiel
                                  {brouillonsOldestDays >= 30 && <span style={{ color: "oklch(0.52 0.085 245)", fontWeight: 600 }}> · le plus ancien : {brouillonsOldestDays} jours</span>}
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: brouillonsOldestDays >= 30 ? "oklch(0.52 0.085 245 / 0.12)" : "var(--accent-soft)", color: brouillonsOldestDays >= 30 ? "oklch(0.52 0.085 245)" : "var(--accent)" }}>
                                  {brouillonsOldestDays >= 30 ? "À traiter" : "Brouillons"}
                                </span>
                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{brouillonsOpen ? "▲" : "▼"}</span>
                              </div>
                            </button>
                            {brouillonsOpen && brouillonsItems.length > 0 && (
                              <div style={{ borderTop: "1px solid var(--border)", padding: "0 18px" }}>
                                {[...brouillonsItems].sort((a, b) => b.days - a.days).map((item, i) => {
                                  const urgent = item.days >= 60;
                                  const attention = item.days >= 30;
                                  const ageColor = urgent ? "oklch(0.52 0.085 245)" : attention ? "oklch(0.62 0.12 55)" : "var(--text-muted)";
                                  const ageBg = urgent ? "oklch(0.52 0.085 245 / 0.12)" : attention ? "oklch(0.62 0.12 55 / 0.12)" : "var(--surface-2)";
                                  return (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < brouillonsItems.length - 1 ? "1px solid var(--border)" : "none" }}>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</div>
                                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{item.client}</div>
                                      </div>
                                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", flexShrink: 0 }}>{fmt(item.montant_ht)}</span>
                                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999, flexShrink: 0, background: ageBg, color: ageColor }}>
                                        {item.days === 0 ? "auj." : item.days === 1 ? "hier" : `${item.days} j`}
                                      </span>
                                    </div>
                                  );
                                })}
                                <div style={{ padding: "8px 0", display: "flex", justifyContent: "flex-end" }}>
                                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{brouillonsCount} devis · {fmt(brouillonsTotal)} HT potentiel</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Devis à faire suite à intervention — collapsible */}
                        {devisAFaireCount > 0 ? (
                          <div className="card" style={{ padding: 0, overflow: "hidden", borderLeft: "3px solid oklch(0.52 0.1 295)" }}>
                            <button onClick={() => setDevisAFaireOpen((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                                  Devis à établir{" "}
                                  <span style={{ fontSize: 12, fontWeight: 500, color: "oklch(0.52 0.1 295)" }}>· suite à intervention</span>
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                                  {devisAFaireCount} intervention(s) en attente de chiffrage
                                  {devisAFaireTotal > 0 && ` · ${fmt(devisAFaireTotal)} HT estimé`}
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "oklch(0.52 0.1 295 / 0.12)", color: "oklch(0.52 0.1 295)" }}>
                                  À chiffrer
                                </span>
                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{devisAFaireOpen ? "▲" : "▼"}</span>
                              </div>
                            </button>
                            {devisAFaireOpen && devisAFaireItems.length > 0 && (
                              <div style={{ borderTop: "1px solid var(--border)", padding: "0 18px" }}>
                                {devisAFaireItems.map((item, i) => (
                                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < devisAFaireItems.length - 1 ? "1px solid var(--border)" : "none" }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</div>
                                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{item.client} · Intervention : {item.intervention_date}</div>
                                    </div>
                                    {item.montant_ht > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", flexShrink: 0 }}>{fmt(item.montant_ht)}</span>}
                                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999, flexShrink: 0, background: "oklch(0.52 0.1 295 / 0.1)", color: "oklch(0.52 0.1 295)" }}>
                                      {item.days_since === 0 ? "auj." : item.days_since === 1 ? "hier" : `${item.days_since} j`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="card" style={{ padding: "12px 18px", borderLeft: "3px solid var(--border)", opacity: 0.65 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Devis à établir · suite à intervention</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Aucune intervention en attente de chiffrage · données non synchronisées</div>
                          </div>
                        )}
                      </>
                    )}

                    {/* ── SECTION 2 : Statistiques commerciales ────────────────────── */}
                    <div id="section-stats" />
                    <SectionLabel label="Statistiques commerciales" />

                    {devisEnvoyesCount > 0 && (
                      <div className="card" style={{ padding: "18px 20px" }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>Entonnoir de conversion</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Exercice en cours</div>
                          </div>
                          {tauxConversionGlobal !== null && (
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 24, fontWeight: 800, color: tauxConversionGlobal >= 15 ? "oklch(0.55 0.085 155)" : tauxConversionGlobal >= 10 ? "var(--accent)" : "oklch(0.52 0.085 245)" }}>
                                {tauxConversionGlobal} %
                              </div>
                              <div style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                                Taux de conversion <Tooltip text={`${devisSignesCount} devis signés sur ${totalDevisVersClients} envoyés aux clients (y compris ceux en attente et refusés).\nTaux = ${devisSignesCount} / ${totalDevisVersClients} = ${tauxConversionGlobal} %.\n\nTaux parmi les décidés seulement : ${tauxTransformation ?? "—"} % (${devisSignesCount} signés / ${devisDecides} décidés).`} />
                              </div>
                              {tauxTransformation !== null && (
                                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{tauxTransformation} % parmi les décidés</div>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {[
                            { label: "Devis envoyés", count: devisEnvoyesCount, amount: devisEnvoyesTotal, color: "oklch(0.52 0.085 245)", width: 100, tooltip: `${devisEnvoyesCount} devis envoyés aux clients sur cet exercice · ${fmt(devisEnvoyesTotal)} HT total.` },
                            { label: "Devis signés", count: devisSignesCount, amount: pipeline, color: "var(--accent)", width: devisEnvoyesCount > 0 ? Math.round((devisSignesCount / devisEnvoyesCount) * 100) : 0, tooltip: `${devisSignesCount} devis acceptés et signés pour ${fmt(pipeline)} HT — carnet de commandes garanti.` },
                            { label: "Chantiers en cours", count: chantiersEnCours, amount: null, color: "oklch(0.55 0.085 155)", width: devisEnvoyesCount > 0 ? Math.round((chantiersEnCours / devisEnvoyesCount) * 100) : 0, tooltip: `${chantiersEnCours} chantiers en cours · ${chantiersNonDemarre} planifiés · ${chantiersTermines} terminés.` },
                            { label: "CA facturé", count: null, amount: caReel, color: "oklch(0.55 0.085 155)", width: devisEnvoyesTotal > 0 ? Math.min(Math.round((caReel / devisEnvoyesTotal) * 100), 100) : 0, tooltip: `${fmt(caReel)} HT facturés sur l'exercice — soit ${devisEnvoyesTotal > 0 ? Math.round((caReel / devisEnvoyesTotal) * 100) : 0} % du pipe total.` },
                          ].map((step, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{ width: 130, flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{step.label}</span>
                                <Tooltip text={step.tooltip} />
                              </div>
                              <div style={{ flex: 1, position: "relative", height: 28, background: "var(--surface-2)", borderRadius: 6, overflow: "hidden" }}>
                                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${step.width}%`, background: step.color, borderRadius: 6, opacity: 0.85, transition: "width 0.5s ease" }} />
                                <div style={{ position: "absolute", left: 10, top: 0, height: "100%", display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: step.width > 25 ? "#fff" : "var(--text)", zIndex: 1 }}>
                                  {step.count !== null && <span>{step.count} devis</span>}
                                  {step.amount !== null && <span>{fmt(step.amount)}</span>}
                                  <span style={{ opacity: 0.8 }}>({step.width} %)</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: caPerduesEstimate > 0 ? 10 : 0 }}>
                            {devisRefusesCount > 0 && (
                              <span style={{ fontSize: 12, color: "var(--text-muted)" }}><strong style={{ color: "oklch(0.52 0.085 245)" }}>{devisRefusesCount}</strong> devis refusés</span>
                            )}
                            {devisEnvoyesCount > 0 && (
                              <span style={{ fontSize: 12, color: "var(--text-muted)" }}><strong>{devisEnvoyesCount}</strong> en attente de réponse</span>
                            )}
                            {chantiersTotal > 0 && (
                              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                <strong style={{ color: "oklch(0.52 0.085 245)" }}>{chantiersNonDemarre}</strong> à démarrer · <strong style={{ color: "var(--accent)" }}>{chantiersEnCours}</strong> en cours · <strong style={{ color: "oklch(0.55 0.085 155)" }}>{chantiersTermines}</strong> terminés
                              </span>
                            )}
                          </div>
                          {caPerduesEstimate > 0 && devisRefusesCount > 0 && (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "oklch(0.52 0.085 245 / 0.06)", borderRadius: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>CA potentiel non signé</span>
                                <Tooltip text={`Estimation du CA qui aurait pu être généré si les ${devisRefusesCount} devis refusés avaient été signés.\nValeur moyenne d'un devis : ${fmt(Math.round(avgDevisHT))}.\nEstimation — les devis refusés peuvent avoir des valeurs très différentes.`} />
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <span style={{ fontSize: 16, fontWeight: 800, color: "oklch(0.52 0.085 245)" }}>{fmt(caPerduesEstimate)}</span>
                                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>estimé · {devisRefusesCount} devis refusés</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── SECTION 3 : CA Vendu & Plan de charge ────────────────────── */}
                    <div id="section-ca" />
                    <SectionLabel label="CA Vendu & Plan de charge" />

                    {hasPoleData && (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", borderRadius: 10, padding: 3 }}>
                          {([
                            { id: "tous" as PoleFilter, label: "Tous les pôles" },
                            { id: "maintenance" as PoleFilter, label: "Maintenance" },
                            { id: "travaux" as PoleFilter, label: "Travaux & Installation" },
                          ]).map((p) => (
                            <button key={p.id} onClick={() => setPoleFilter(p.id)} style={{
                              padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12,
                              fontWeight: poleFilter === p.id ? 600 : 400,
                              background: poleFilter === p.id ? "var(--surface)" : "transparent",
                              color: poleFilter === p.id ? "var(--accent)" : "var(--text-muted)",
                              boxShadow: poleFilter === p.id ? "0 1px 4px rgba(40,30,20,0.1)" : "none",
                              transition: "all 0.15s",
                            }}>{p.label}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                      <KPI label="CA Facturé HT"
                        tooltip="Chiffre d'affaires effectivement facturé à ce jour sur l'exercice. Source Interfast."
                        value={fmt(filteredCaReel)} sub={poleFilter === "tous" ? "Facturé à ce jour" : `Pôle ${poleFilter}`} color="accent" />
                      <KPI label="CA Projeté fin exercice"
                        tooltip="CA facturé + chantiers en cours + devis signés à planifier. Recalculé à chaque synchro Interfast."
                        value={fmt(filteredCaPrev)} sub="Facturé + en cours + prévu" />
                      <KPI label="Carnet de commandes"
                        tooltip="Devis signés par les clients — travaux commandés mais pas encore planifiés ou facturés."
                        value={fmt(filteredPipeline)} sub={devisSignesCount > 0 && poleFilter === "tous" ? `${devisSignesCount} devis signés` : "Devis signés"} color="blue" />
                      <KPI label="Impayés"
                        tooltip="Montant total des factures en retard de paiement à la date de synchro."
                        value={fmt(filteredRetards)} sub="Retards de paiement" color={filteredRetards > 0 ? "warn" : undefined} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div className="card" style={{ padding: "16px 18px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Répartition du CA facturé</div>
                        <CostRow label="Main d'œuvre" value={filteredMo} total={filteredCaReel} color="var(--accent)" />
                        <CostRow label="Fournitures" value={filteredFournitures} total={filteredCaReel} color="oklch(0.52 0.1 295)" />
                        <div style={{ paddingTop: 10, borderTop: "1px solid var(--border)", marginTop: 4 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                            <span style={{ color: "var(--text-muted)" }}>Ratio MO / CA</span>
                            <strong>{pct(filteredMo, filteredCaReel)}</strong>
                          </div>
                        </div>
                      </div>
                      <div className="card" style={{ padding: "16px 18px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Indicateurs clés</div>
                        {[
                          { label: "Taux réalisation CA", value: pct(caReel, caPrev) },
                          { label: "Carnet / CA réalisé", value: pct(pipeline, caReel) },
                          { label: "Impayés / CA réalisé", value: pct(retards, caReel) },
                          { label: "TVA collectée", value: fmt(interfastStats.tva_reel) },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                            <span style={{ color: "var(--text-muted)" }}>{label}</span>
                            <strong>{value}</strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── SECTION 4 : Analyse par pôle ─────────────────────────────── */}
                    {hasPoleData && (
                      <>
                        <div id="section-poles" />
                        <SectionLabel label="Analyse par pôle" />
                        <div className="card" style={{ padding: "16px 18px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>Répartition Maintenance / Travaux</div>
                            <SourceBadge source="interfast" />
                          </div>
                          <div style={{ display: "flex", height: 28, borderRadius: 8, overflow: "hidden", gap: 2, marginBottom: 16 }}>
                            <div style={{ flex: caReelMaintenance, background: "oklch(0.52 0.085 245 / 0.75)", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "15%" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "white" }}>Maintenance · {caMaintenancePct} %</span>
                            </div>
                            <div style={{ flex: caReelTravaux, background: "var(--accent)", opacity: 0.85, display: "flex", alignItems: "center", justifyContent: "center", minWidth: "15%" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "white" }}>Travaux · {caTravauxPct} %</span>
                            </div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            {/* Maintenance */}
                            <div style={{ padding: "14px 16px", background: "var(--surface-2)", borderRadius: 12, borderLeft: "3px solid oklch(0.52 0.085 245)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "oklch(0.52 0.085 245)", flexShrink: 0 }} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Maintenance</span>
                                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>· Contrats & entretiens</span>
                              </div>
                              {[
                                { label: "CA facturé", value: fmt(caReelMaintenance), accent: "oklch(0.52 0.085 245)" },
                                { label: "CA projeté", value: fmt(caPrevMaintenance) },
                                { label: "Carnet", value: fmt(devisSignesMaintenance) },
                                { label: "Impayés", value: fmt(retardsMaintenance), warn: retardsMaintenance > 0 },
                                { label: "Main d'œuvre", value: fmt(moReelMaintenance) },
                                { label: "Fournitures", value: fmt(fournituresReelMaintenance) },
                              ].map(({ label, value, accent, warn }) => (
                                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                                  <strong style={{ color: warn ? "oklch(0.52 0.085 245)" : accent ?? "var(--text)" }}>{value}</strong>
                                </div>
                              ))}
                              <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>Ratio MO : <strong>{pct(moReelMaintenance, caReelMaintenance)}</strong></div>
                            </div>
                            {/* Travaux */}
                            <div style={{ padding: "14px 16px", background: "var(--surface-2)", borderRadius: 12, borderLeft: "3px solid var(--accent)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Travaux & Installation</span>
                                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>· Chantiers & équipements</span>
                              </div>
                              {[
                                { label: "CA facturé", value: fmt(caReelTravaux), accent: "var(--accent)" },
                                { label: "CA projeté", value: fmt(caPrevTravaux) },
                                { label: "Carnet", value: fmt(devisSignesTravaux) },
                                { label: "Impayés", value: fmt(retardsTravaux), warn: retardsTravaux > 0 },
                                { label: "Main d'œuvre", value: fmt(moReelTravaux) },
                                { label: "Fournitures", value: fmt(fournituresReelTravaux) },
                              ].map(({ label, value, accent, warn }) => (
                                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                                  <strong style={{ color: warn ? "oklch(0.52 0.085 245)" : accent ?? "var(--text)" }}>{value}</strong>
                                </div>
                              ))}
                              <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>Ratio MO : <strong>{pct(moReelTravaux, caReelTravaux)}</strong></div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {interfastStats.synced_at && (
                      <p style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "right" }}>
                        Dernière synchro Interfast : {new Date(interfastStats.synced_at).toLocaleString("fr-FR")}
                      </p>
                    )}
                  </>
                )}
              </>
            )}

            {/* ══ FINANCE — Historique ════════════════════════════════════════ */}
            {tab === "finance" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Historique</span>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                </div>

                {/* Charges fournisseurs par exercice (Pennylane) */}
                <div className="card" style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Charges fournisseurs par exercice — depuis 2018</div>
                    <SourceBadge source="pennylane" />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>
                    Factures fournisseurs Pennylane · exercices oct → sept · CA disponible dans les bilans ci-dessous
                  </div>
                  {plLoading ? (
                    <div style={{ height: 150, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>
                      Chargement de l'historique Pennylane…
                    </div>
                  ) : plHistory.filter(h => h.charges_fournisseurs > 0).length > 0 ? (
                    <HistoryBars entries={plHistory.map((h) => ({ label: h.label, ca_ht: h.charges_fournisseurs, isCurrent: h.isCurrent }))} />
                  ) : (
                    <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", borderRadius: 10, color: "var(--text-muted)", fontSize: 12 }}>
                      {plLoading ? "Chargement…" : plConnected ? "Aucune charge fournisseur trouvée" : "Connectez Pennylane pour voir l'historique"}
                    </div>
                  )}
                </div>

                {/* Tableau historique charges Pennylane */}
                {plHistory.filter(h => h.charges_fournisseurs > 0).length > 0 && (
                  <div className="card" style={{ padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Charges fournisseurs par exercice</div>
                      <SourceBadge source="pennylane" />
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            <th style={{ textAlign: "left", padding: "0 10px 8px 0" }}>Exercice</th>
                            <th style={{ textAlign: "right", padding: "0 10px 8px" }}>Charges fourn. HT</th>
                            <th style={{ textAlign: "right", padding: "0 10px 8px" }}>Nb factures</th>
                            <th style={{ textAlign: "right", padding: "0 0 8px 10px" }}>Évolution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plHistory.filter(h => h.charges_fournisseurs > 0).map((h, i, arr) => {
                            const prev = arr[i - 1];
                            const d = delta(h.charges_fournisseurs, prev?.charges_fournisseurs ?? null);
                            return (
                              <tr key={h.label} style={{ borderTop: "1px solid var(--border)", background: h.isCurrent ? "var(--accent-soft)" : "transparent" }}>
                                <td style={{ padding: "9px 10px 9px 0", fontWeight: h.isCurrent ? 700 : 500, color: h.isCurrent ? "var(--accent)" : "var(--text)" }}>
                                  {h.label}{h.isCurrent ? " *" : ""}
                                </td>
                                <td style={{ textAlign: "right", padding: "9px 10px", fontWeight: 600 }}>{fmt(h.charges_fournisseurs)}</td>
                                <td style={{ textAlign: "right", padding: "9px 10px", color: "var(--text-muted)" }}>{h.charge_count}</td>
                                <td style={{ textAlign: "right", padding: "9px 0 9px 10px" }}>
                                  {d ? <span style={{ fontWeight: 600, color: d.positive ? "oklch(0.52 0.085 245)" : "oklch(0.55 0.085 155)" }}>{d.value}</span> : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "8px 0 0" }}>
                      * En cours · Hors salaires, charges sociales et amortissements
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

            {/* ══ FINANCE — Projection ════════════════════════════════════════ */}
            {tab === "finance" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Projection résultat</span>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: "var(--accent-soft)", color: "var(--accent)" }}>Estimation</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Exercice {fy.label} · basée sur historique Pennylane + données Interfast</span>
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


export default function FinancesPage() {
  return (
    <PageGuard module="finances">
      <FinancesPageInner />
    </PageGuard>
  );
}
