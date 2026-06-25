"use client";

import { useState, useEffect, useCallback } from "react";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

interface StatusSummary { count: number; total: number; }
interface DevisResponse {
  devis: unknown[];
  count: number;
  summary: Record<string, StatusSummary>;
  total: number;
}
interface ClientStat {
  client: string; count: number; total_ht: number;
  count_signed: number; ht_signed: number;
  count_paid: number;   ht_paid: number;
}
interface StatsResponse {
  topClientsDevis: ClientStat[];
  topClientsSigned: ClientStat[];
  topClientsPaid: ClientStat[];
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
  return (
    <div style={{
      background: accent ? "var(--accent-soft)" : "var(--surface)",
      border: `1.5px solid ${accent ? "var(--accent)" : "var(--border)"}`,
      borderRadius: 14, padding: "16px 20px", flex: 1, minWidth: 140,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: accent ? "var(--accent)" : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </div>
        {info && <InfoTooltip text={info} />}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent ? "var(--accent)" : "var(--text)", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function DevisTable({ activites = [] }: { activites?: string[] }) {
  const [data, setData] = useState<DevisResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStatuts, setActiveStatuts] = useState<string[]>([]);

  const fetchData = useCallback(async (statuts: string[]) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "1" });
      if (statuts.length > 0) params.set("statuts", statuts.join(","));
      if (activites.length > 0) params.set("activites", activites.join(","));
      const r = await fetch(`/api/finances/devis?${params}`);
      if (r.ok) setData(await r.json());
    } finally {
      setLoading(false);
    }
  }, [activites]);

  const fetchStats = useCallback(async () => {
    const params = new URLSearchParams();
    if (activites.length > 0) params.set("activites", activites.join(","));
    const r = await fetch(`/api/finances/devis/stats?${params}`);
    if (r.ok) setStats(await r.json());
  }, [activites]);

  useEffect(() => { fetchData(activeStatuts); fetchStats(); }, [activites, fetchData, fetchStats]);

  function toggleStatut(slug: string) {
    if (slug === "all") {
      setActiveStatuts([]);
      fetchData([]);
    } else {
      const next = activeStatuts.includes(slug)
        ? activeStatuts.filter((s) => s !== slug)
        : [...activeStatuts, slug];
      setActiveStatuts(next);
      fetchData(next);
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
      {(stats?.topClientsDevis.length ?? 0) > 0 && (
        <CollapsibleSection
          title="Top clients"
          storageKey="finances.devis.topclients"
          info={"Trois classements indépendants :\n• Devis — clients qui demandent le plus de chiffrages (tous statuts)\n• Signés — clients qui acceptent le plus en montant HT\n• Facturés — clients qui génèrent le plus de CA encaissé\n\nComparer les trois colonnes permet d'identifier les clients à fort volume qui ne signent jamais, et les clients discrets mais très rentables."}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>

            {/* Colonne 1 — Volume de devis */}
            <div style={{ borderRight: "1px solid var(--border)" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Devis demandés
                </span>
              </div>
              {(stats?.topClientsDevis ?? []).map((c, i) => {
                const max = stats!.topClientsDevis[0].count;
                const pct = Math.round((c.count / max) * 100);
                const caTotal = c.ht_signed + c.ht_paid;
                return (
                  <div key={c.client} style={{ padding: "9px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", width: 14, textAlign: "right", flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.client}</div>
                      <div style={{ marginTop: 4, height: 3, background: "var(--border)", borderRadius: 999 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "var(--text-muted)", borderRadius: 999, opacity: 0.5, transition: "width 0.4s" }} />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
                        {c.count_signed} signé{c.count_signed > 1 ? "s" : ""} · CA {caTotal > 0 ? fmt(caTotal) : "—"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{c.count}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)" }}>devis</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Colonne 2 — Signés */}
            <div style={{ borderRight: "1px solid var(--border)" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "#faf5f2" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#b5612f", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Signés
                </span>
              </div>
              {(stats?.topClientsSigned ?? []).map((c, i) => {
                const max = stats!.topClientsSigned[0].ht_signed;
                const pct = Math.round((c.ht_signed / max) * 100);
                const caTotal = c.ht_signed + c.ht_paid;
                return (
                  <div key={c.client} style={{ padding: "9px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", width: 14, textAlign: "right", flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.client}</div>
                      <div style={{ marginTop: 4, height: 3, background: "var(--border)", borderRadius: 999 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "#b5612f", borderRadius: 999, transition: "width 0.4s" }} />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
                        {c.count_signed} signé{c.count_signed > 1 ? "s" : ""} · CA {fmt(caTotal)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#b5612f" }}>{fmt(c.ht_signed)}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)" }}>HT signé</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Colonne 3 — Facturés */}
            <div>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "#f0faf4" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Facturés
                </span>
              </div>
              {(stats?.topClientsPaid ?? []).map((c, i) => {
                const max = stats!.topClientsPaid[0].ht_paid;
                const pct = Math.round((c.ht_paid / max) * 100);
                const caTotal = c.ht_signed + c.ht_paid;
                return (
                  <div key={c.client} style={{ padding: "9px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", width: 14, textAlign: "right", flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.client}</div>
                      <div style={{ marginTop: 4, height: 3, background: "var(--border)", borderRadius: 999 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "#16a34a", borderRadius: 999, transition: "width 0.4s" }} />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
                        {c.count_signed} signé{c.count_signed > 1 ? "s" : ""} · CA {fmt(caTotal)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a" }}>{fmt(c.ht_paid)}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)" }}>HT facturé</div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </CollapsibleSection>
      )}

      {/* ── Tendance mensuelle ── */}
      {stats && stats.byMonth.length > 0 && (
        <CollapsibleSection
          title={`Volume mensuel facturé — ${stats.byMonth.length} mois`}
          storageKey="finances.devis.mensuel"
          info={"Montant HT et nombre de devis passés en statut Facturé (Payé) par mois.\n\nCe graphique reflète votre CA réellement réalisé mois par mois — pas le volume de chiffrage.\n\nUtilisation : repérez les mois creux pour anticiper les périodes de sous-activité et les pics pour dimensionner les équipes."}
        >
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
        </CollapsibleSection>
      )}

    </div>
  );
}
