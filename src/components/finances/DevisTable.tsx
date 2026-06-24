"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface DevisItem {
  id: string;
  reference: string | null;
  titre: string | null;
  client: string | null;
  statut: string;
  montant_ht: number;
  montant_ttc: number;
  created_at_interfast: string | null;
}

interface StatusSummary {
  count: number;
  total: number;
}

interface DevisResponse {
  devis: DevisItem[];
  count: number;
  page: number;
  limit: number;
  summary: Record<string, StatusSummary>;
  total: number;
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

const PILL_ORDER = ["all", "draft", "sent", "finalized", "signed", "refused", "paid", "canceled"];

const fmt = (n: number, d = 0) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: d }).format(n);

const fmtDate = (s: string | null) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch { return s; }
};

export function DevisTable() {
  const [data, setData] = useState<DevisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStatuts, setActiveStatuts] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LIMIT = 50;

  const fetchDevis = useCallback(async (statuts: string[], q: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (statuts.length > 0) params.set("statuts", statuts.join(","));
      if (q.trim()) params.set("q", q.trim());
      const r = await fetch(`/api/finances/devis?${params}`);
      if (r.ok) setData(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevis(activeStatuts, search, page);
  }, [fetchDevis, activeStatuts, page]);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(0);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchDevis(activeStatuts, v, 0), 400);
  }

  function toggleStatut(slug: string) {
    if (slug === "all") {
      setActiveStatuts([]);
    } else {
      setActiveStatuts((prev) =>
        prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
      );
    }
    setPage(0);
  }

  const summary = data?.summary ?? {};
  const totalAll = data?.total ?? 0;
  const totalHT = Object.values(summary).reduce((s, v) => s + v.total, 0);
  const totalCount = Object.values(summary).reduce((s, v) => s + v.count, 0);
  const totalPages = data ? Math.ceil(data.count / LIMIT) : 0;

  const isActive = (slug: string) =>
    slug === "all" ? activeStatuts.length === 0 : activeStatuts.includes(slug);

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
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── Résumé statuts (comme Interfast) ── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {/* Pill "Tous" */}
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

        {/* Pills par statut */}
        {PILL_ORDER.filter((s) => s !== "all").map((slug) => {
          const cfg = STATUS_CONFIG[slug];
          const stat = summary[slug];
          if (!stat) return null;
          const active = isActive(slug);
          return (
            <button
              key={slug}
              onClick={() => toggleStatut(slug)}
              style={{
                display: "flex", flexDirection: "column", padding: "10px 14px", borderRadius: 11,
                border: `1.5px solid ${active ? cfg.color : "var(--border)"}`,
                background: active ? cfg.bg : "var(--surface)",
                cursor: "pointer", minWidth: 90, textAlign: "left", gap: 2, transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: active ? cfg.color : "var(--text)", lineHeight: 1 }}>{stat.count}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, textTransform: "uppercase" }}>{cfg.label}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmt(stat.total)}</div>
            </button>
          );
        })}
      </div>

      {/* ── Barre de filtres ── */}
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
          <button
            onClick={() => { setSearch(""); setActiveStatuts([]); setPage(0); fetchDevis([], "", 0); }}
            style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: 12, cursor: "pointer", color: "var(--text-muted)" }}
          >
            Réinitialiser
          </button>
        )}
        <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          {loading ? "…" : `${data?.count ?? 0} devis`}
        </span>
      </div>

      {/* ── Tableau ── */}
      <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 200px 110px 110px 100px", gap: 0, borderBottom: "1.5px solid var(--border)", padding: "9px 16px", background: "var(--surface2)" }}>
          {["Référence", "Titre", "Client", "Montant HT", "Montant TTC", "Statut"].map((h, i) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", ...(i > 2 ? { textAlign: "right" } : {}) }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Chargement…</div>
        ) : (data?.devis ?? []).length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Aucun résultat</div>
        ) : (
          (data?.devis ?? []).map((d, i) => {
            const cfg = STATUS_CONFIG[d.statut] ?? { label: d.statut, color: "var(--text-muted)", bg: "var(--surface2)", border: "var(--border)" };
            return (
              <div
                key={d.id}
                style={{
                  display: "grid", gridTemplateColumns: "110px 1fr 200px 110px 110px 100px", gap: 0,
                  padding: "11px 16px", alignItems: "center",
                  borderBottom: i < (data?.devis.length ?? 0) - 1 ? "1px solid var(--border)" : "none",
                  background: i % 2 === 0 ? "var(--surface)" : "var(--surface2)",
                }}
              >
                {/* Référence */}
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", fontFamily: "monospace" }}>
                  {d.reference ?? "—"}
                </div>

                {/* Titre + Date */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.titre || "—"}
                  </div>
                  {d.created_at_interfast && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{fmtDate(d.created_at_interfast)}</div>
                  )}
                </div>

                {/* Client */}
                <div style={{ fontSize: 12, color: "var(--text-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.client || "—"}
                </div>

                {/* Montant HT */}
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", textAlign: "right" }}>
                  {fmt(d.montant_ht)}
                </div>

                {/* Montant TTC */}
                <div style={{ fontSize: 12, color: "var(--text-soft)", textAlign: "right" }}>
                  {fmt(d.montant_ttc)}
                </div>

                {/* Statut */}
                <div style={{ textAlign: "right" }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                    background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                    whiteSpace: "nowrap",
                  }}>
                    {cfg.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            style={{ padding: "6px 14px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: 12, cursor: page === 0 ? "not-allowed" : "pointer", opacity: page === 0 ? 0.4 : 1, color: "var(--text)" }}
          >
            ← Précédent
          </button>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Page {page + 1} / {totalPages} · {data?.count ?? 0} résultats
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: "6px 14px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: 12, cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", opacity: page >= totalPages - 1 ? 0.4 : 1, color: "var(--text)" }}
          >
            Suivant →
          </button>
        </div>
      )}

    </div>
  );
}
