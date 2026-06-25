"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface StatusSummary { count: number; total: number; }
interface DevisResponse {
  devis: unknown[];
  count: number;
  summary: Record<string, StatusSummary>;
  total: number;
}
interface StatsResponse {
  topClients: { client: string; count: number; total_ht: number }[];
  byMonth: { month: string; count: number; total_ht: number }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: "Brouillon",  color: "#64748b", bg: "#f1f5f9",  border: "#cbd5e1" },
  finalized: { label: "Finalisé",   color: "#0d9488", bg: "#e3f5f4",  border: "#99d9d5" },
  sent:      { label: "Envoyé",     color: "#2563eb", bg: "#dbeafe",  border: "#93c5fd" },
  signed:    { label: "Accepté",    color: "#b5612f", bg: "#f5ede6",  border: "#d4a488" },
  canceled:  { label: "Annulé",     color: "#9ca3af", bg: "#f3f4f6",  border: "#d1d5db" },
  refused:   { label: "Refusé",     color: "#dc2626", bg: "#fee2e2",  border: "#fca5a5" },
  paid:      { label: "Facturé",    color: "#16a34a", bg: "#e6f4ed",  border: "#86efac" },
};

const PILL_ORDER = ["draft", "finalized", "sent", "signed", "refused", "paid", "canceled"];

const fmt = (n: number, d = 0) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: d }).format(n);

function KpiCard({ label, value, sub, accent, info }: { label: string; value: string; sub?: string; accent?: boolean; info?: string }) {
  const [showTip, setShowTip] = useState(false);
  return (
    <div style={{
      background: accent ? "var(--accent-soft)" : "var(--surface)",
      border: `1.5px solid ${accent ? "var(--accent)" : "var(--border)"}`,
      borderRadius: 14, padding: "16px 20px", flex: 1, minWidth: 140, position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: accent ? "var(--accent)" : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </div>
        {info && (
          <div style={{ position: "relative", lineHeight: 1 }}>
            <button
              onMouseEnter={() => setShowTip(true)}
              onMouseLeave={() => setShowTip(false)}
              style={{
                width: 15, height: 15, borderRadius: "50%", border: `1px solid ${accent ? "var(--accent)" : "var(--border)"}`,
                background: "transparent", cursor: "pointer", padding: 0,
                fontSize: 9, fontWeight: 700, color: accent ? "var(--accent)" : "var(--text-muted)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
              aria-label="Explication du calcul"
            >
              i
            </button>
            {showTip && (
              <div style={{
                position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                background: "oklch(0.28 0.014 60)", color: "#fff", fontSize: 11, lineHeight: 1.45,
                padding: "8px 10px", borderRadius: 9, whiteSpace: "pre-wrap", minWidth: 200, maxWidth: 260,
                boxShadow: "0 4px 12px rgba(40,30,20,0.18)", zIndex: 100, pointerEvents: "none",
              }}>
                {info}
                <div style={{
                  position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                  width: 0, height: 0,
                  borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
                  borderTop: "5px solid oklch(0.28 0.014 60)",
                }} />
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent ? "var(--accent)" : "var(--text)", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function DevisTable() {
  const [data, setData] = useState<DevisResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStatuts, setActiveStatuts] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (statuts: string[], q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "1" }); // on veut juste le résumé
      if (statuts.length > 0) params.set("statuts", statuts.join(","));
      if (q.trim()) params.set("q", q.trim());
      const r = await fetch(`/api/finances/devis?${params}`);
      if (r.ok) setData(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    const r = await fetch("/api/finances/devis/stats");
    if (r.ok) setStats(await r.json());
  }, []);

  useEffect(() => { fetchData([], ""); fetchStats(); }, [fetchData, fetchStats]);

  function handleSearch(v: string) {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchData(activeStatuts, v), 400);
  }

  function toggleStatut(slug: string) {
    if (slug === "all") {
      setActiveStatuts([]);
      fetchData([], search);
    } else {
      const next = activeStatuts.includes(slug)
        ? activeStatuts.filter((s) => s !== slug)
        : [...activeStatuts, slug];
      setActiveStatuts(next);
      fetchData(next, search);
    }
  }

  const summary = data?.summary ?? {};
  const totalAll = data?.total ?? 0;
  const totalHT = Object.values(summary).reduce((s, v) => s + v.total, 0);
  const totalCount = Object.values(summary).reduce((s, v) => s + v.count, 0);

  const isActive = (slug: string) =>
    slug === "all" ? activeStatuts.length === 0 : activeStatuts.includes(slug);

  // KPIs calculés
  const caGagne = (summary.signed?.total ?? 0) + (summary.paid?.total ?? 0);
  const countGagne = (summary.signed?.count ?? 0) + (summary.paid?.count ?? 0);
  const caPipeline = (summary.sent?.total ?? 0) + (summary.finalized?.total ?? 0);
  const countPipeline = (summary.sent?.count ?? 0) + (summary.finalized?.count ?? 0);
  const base = countGagne + countPipeline + (summary.refused?.count ?? 0);
  const tauxSig = base > 0 ? Math.round((countGagne / base) * 100) : 0;
  const panierMoyen = totalCount > 0 ? totalHT / totalCount : 0;

  // Filtrage top clients selon statuts actifs
  const filteredClients = stats?.topClients ?? [];
  const maxClientHT = filteredClients[0]?.total_ht ?? 1;

  if (totalAll === 0 && !loading) {
    return (
      <div style={{ padding: "32px 20px", textAlign: "center", background: "var(--surface)", borderRadius: 14, border: "1.5px solid var(--border)" }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Aucun devis synchronisé</div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 auto", maxWidth: 340 }}>
          Demandez à Aria de synchroniser les devis Interfast pour activer cette vue.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Pills par statut ── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          onClick={() => toggleStatut("all")}
          style={{
            display: "flex", flexDirection: "column", padding: "10px 14px", borderRadius: 11,
            border: `1.5px solid ${isActive("all") ? "var(--accent)" : "var(--border)"}`,
            background: isActive("all") ? "var(--accent-soft)" : "var(--surface)",
            cursor: "pointer", minWidth: 90, textAlign: "left", gap: 2, transition: "all 0.15s",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: isActive("all") ? "var(--accent)" : "var(--text)", lineHeight: 1 }}>{totalCount}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Tous</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmt(totalHT)}</div>
        </button>

        {PILL_ORDER.map((slug) => {
          const cfg = STATUS_CONFIG[slug];
          const stat = summary[slug];
          if (!stat) return null;
          const active = isActive(slug);
          return (
            <button key={slug} onClick={() => toggleStatut(slug)} style={{
              display: "flex", flexDirection: "column", padding: "10px 14px", borderRadius: 11,
              border: `1.5px solid ${active ? cfg.color : "var(--border)"}`,
              background: active ? cfg.bg : "var(--surface)",
              cursor: "pointer", minWidth: 90, textAlign: "left", gap: 2, transition: "all 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: active ? cfg.color : "var(--text)", lineHeight: 1 }}>{stat.count}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, textTransform: "uppercase" }}>{cfg.label}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmt(stat.total)}</div>
            </button>
          );
        })}
      </div>

      {/* ── Barre de recherche ── */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            type="text"
            placeholder="Rechercher par titre, client, référence…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: "100%", padding: "8px 12px 8px 34px",
              border: "1.5px solid var(--border)", borderRadius: 10,
              fontSize: 13, background: "var(--surface)", color: "var(--text)", boxSizing: "border-box",
              outline: "none",
            }}
          />
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--text-muted)", pointerEvents: "none" }}>🔍</span>
        </div>
        {(search || activeStatuts.length > 0) && (
          <button onClick={() => { setSearch(""); setActiveStatuts([]); fetchData([], ""); }}
            style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: 12, cursor: "pointer", color: "var(--text-muted)" }}>
            Réinitialiser
          </button>
        )}
        <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          {loading ? "…" : `${totalCount} devis · ${fmt(totalHT)}`}
        </span>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <KpiCard
          label="CA Signé + Facturé" value={fmt(caGagne)} sub={`${countGagne} devis`} accent
          info={"Somme des montants HT des devis :\n• Acceptés (Signé)\n• Facturés (Payé)"}
        />
        <KpiCard
          label="Pipeline actif" value={fmt(caPipeline)} sub={`${countPipeline} en cours`}
          info={"Somme des montants HT des devis :\n• Envoyés (en attente de réponse)\n• Finalisés (prêts à envoyer)\n\nReprésentent le CA potentiel à signer."}
        />
        <KpiCard
          label="Taux de signature" value={`${tauxSig} %`} sub={`sur ${base} devis traités`}
          info={`Devis signés ou facturés ÷ (signés + facturés + envoyés + finalisés + refusés)\n\nExclut les brouillons et annulés.\nBase actuelle : ${base} devis.`}
        />
        <KpiCard
          label="Panier moyen" value={fmt(panierMoyen)} sub="par devis"
          info={"Montant HT total ÷ nombre total de devis\n(tous statuts confondus, hors filtres)"}
        />
      </div>

      {/* ── Top clients ── */}
      {filteredClients.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1.5px solid var(--border)", background: "var(--surface2)" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Top clients — Montant HT
            </span>
          </div>
          <div style={{ padding: "8px 0" }}>
            {filteredClients.map((c, i) => {
              const pct = Math.round((c.total_ht / maxClientHT) * 100);
              return (
                <div key={c.client} style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: i < filteredClients.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", width: 20, textAlign: "right", flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.client}
                    </div>
                    <div style={{ marginTop: 4, height: 4, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 999, transition: "width 0.4s" }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{fmt(c.total_ht)}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{c.count} devis</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tendance mensuelle ── */}
      {stats && stats.byMonth.length > 1 && (
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1.5px solid var(--border)", background: "var(--surface2)" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Volume mensuel — {stats.byMonth.length} mois
            </span>
          </div>
          <div style={{ padding: "12px 16px", display: "flex", gap: 6, alignItems: "flex-end", overflowX: "auto" }}>
            {(() => {
              const maxHT = Math.max(...stats.byMonth.map((m) => m.total_ht), 1);
              return stats.byMonth.map((m) => {
                const [year, month] = m.month.split("-");
                const label = new Date(Number(year), Number(month) - 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
                const h = Math.max(Math.round((m.total_ht / maxHT) * 80), 4);
                return (
                  <div key={m.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1, minWidth: 40 }}>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600 }}>{fmt(m.total_ht / 1000, 0)}k</div>
                    <div style={{ width: "100%", height: h, background: "var(--accent)", borderRadius: "4px 4px 0 0", opacity: 0.85, minHeight: 4 }} />
                    <div style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "center" }}>{label}</div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{m.count}</div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
