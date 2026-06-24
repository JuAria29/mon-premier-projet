"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ChantierItem {
  id: string;
  reference: string | null;
  titre: string | null;
  client: string | null;
  adresse: string | null;
  statut: string;
  date_debut: string | null;
  date_fin_prevue: string | null;
}

interface ChantierResponse {
  chantiers: ChantierItem[];
  count: number;
  page: number;
  limit: number;
  summary: Record<string, number>;
  total: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  not_started: { label: "À démarrer",  color: "#2563eb", bg: "#dbeafe",  border: "#93c5fd",  dot: "#2563eb" },
  ongoing:     { label: "En cours",    color: "#b5612f", bg: "#f5ede6",  border: "#d4a488",  dot: "#b5612f" },
  finished:    { label: "Terminé",     color: "#16a34a", bg: "#e6f4ed",  border: "#86efac",  dot: "#16a34a" },
};

const FLOW_ORDER = ["not_started", "ongoing", "finished"] as const;

const fmtDate = (s: string | null, short = false) => {
  if (!s) return null;
  try {
    return new Date(s).toLocaleDateString("fr-FR", short
      ? { day: "numeric", month: "short" }
      : { day: "numeric", month: "short", year: "numeric" }
    );
  } catch { return s; }
};

function isLate(dateStr: string | null, statut: string) {
  if (!dateStr || statut === "finished") return false;
  return new Date(dateStr) < new Date();
}

function ChantierCard({ chantier }: { chantier: ChantierItem }) {
  const cfg = STATUS_CONFIG[chantier.statut] ?? STATUS_CONFIG.finished;
  const late = isLate(chantier.date_fin_prevue, chantier.statut);

  const adresseShort = chantier.adresse
    ? chantier.adresse.replace(/^[^,]+,\s*/, "").split(",")[0]?.trim()
    : null;

  return (
    <div style={{
      background: "#fff",
      border: `1.5px solid ${late ? "#fca5a5" : "var(--border)"}`,
      borderRadius: 12,
      padding: "12px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 7,
      transition: "box-shadow 0.15s",
    }}>
      {/* Référence + statut badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        {chantier.reference && (
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: "var(--text-muted)", background: "var(--surface2)", padding: "2px 7px", borderRadius: 999, border: "1px solid var(--border)" }}>
            {chantier.reference}
          </span>
        )}
        {late && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", marginLeft: "auto" }}>
            En retard
          </span>
        )}
      </div>

      {/* Titre */}
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.35 }}>
        {chantier.titre || "—"}
      </div>

      {/* Client */}
      {chantier.client && (
        <div style={{ fontSize: 12, color: "var(--text-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {chantier.client}
        </div>
      )}

      {/* Adresse courte */}
      {adresseShort && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          📍 {adresseShort}
        </div>
      )}

      {/* Dates */}
      {(chantier.date_debut || chantier.date_fin_prevue) && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
          {chantier.date_debut && <span>Du {fmtDate(chantier.date_debut, true)}</span>}
          {chantier.date_fin_prevue && (
            <span style={{ color: late ? "#dc2626" : "var(--text-muted)", fontWeight: late ? 600 : 400 }}>
              → {fmtDate(chantier.date_fin_prevue, true)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function KanbanColumn({
  statut, chantiers, count,
}: {
  statut: typeof FLOW_ORDER[number];
  chantiers: ChantierItem[];
  count: number;
}) {
  const cfg = STATUS_CONFIG[statut];
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 0,
      background: "var(--surface2)",
      borderRadius: 14,
      overflow: "hidden",
      border: "1.5px solid var(--border)",
      minWidth: 280,
      flex: 1,
    }}>
      {/* Column header */}
      <div style={{ padding: "12px 16px", borderBottom: "1.5px solid var(--border)", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{cfg.label}</span>
          <span style={{
            marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999,
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
          }}>
            {count}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 260px)" }}>
        {chantiers.length === 0 ? (
          <div style={{ padding: "24px 12px", textAlign: "center", color: "var(--text-muted)", fontSize: 12, opacity: 0.6 }}>
            Aucun chantier
          </div>
        ) : (
          chantiers.map((c) => <ChantierCard key={c.id} chantier={c} />)
        )}
      </div>
    </div>
  );
}

export function ChantierBoard() {
  const [data, setData] = useState<ChantierResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchChantiers = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (q.trim()) params.set("q", q.trim());
      const r = await fetch(`/api/finances/chantiers?${params}`);
      if (r.ok) setData(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchChantiers(""); }, [fetchChantiers]);

  function handleSearch(v: string) {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchChantiers(v), 350);
  }

  const allChantiers = data?.chantiers ?? [];
  const summary = data?.summary ?? {};
  const total = data?.total ?? 0;

  if (total === 0 && !loading) {
    return (
      <div style={{ padding: "32px 20px", textAlign: "center", background: "var(--surface)", borderRadius: 14, border: "1.5px solid var(--border)" }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🏗️</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Aucun chantier synchronisé</div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 auto", maxWidth: 340 }}>
          Demandez à Aria de synchroniser les chantiers Interfast pour activer cette vue.
        </p>
      </div>
    );
  }

  // Groupe par statut
  const byStatut: Record<string, ChantierItem[]> = { not_started: [], ongoing: [], finished: [] };
  for (const c of allChantiers) {
    if (byStatut[c.statut]) byStatut[c.statut].push(c);
    else byStatut.finished.push(c);
  }

  const totalLate = allChantiers.filter((c) =>
    c.statut !== "finished" && c.date_fin_prevue && new Date(c.date_fin_prevue) < new Date()
  ).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── Barre de recherche ── */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            type="text"
            placeholder="Rechercher par titre, client, référence, adresse…"
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
        {search && (
          <button onClick={() => { setSearch(""); fetchChantiers(""); }}
            style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--surface)", fontSize: 12, cursor: "pointer", color: "var(--text-muted)" }}>
            Réinitialiser
          </button>
        )}
        <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          {loading ? "…" : `${total} chantiers`}
        </span>
        {totalLate > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", whiteSpace: "nowrap" }}>
            {totalLate} en retard
          </span>
        )}
      </div>

      {/* ── Kanban ── */}
      {loading ? (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Chargement…</div>
      ) : (
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", overflowX: "auto" }}>
          {FLOW_ORDER.map((statut) => (
            <KanbanColumn
              key={statut}
              statut={statut}
              chantiers={byStatut[statut]}
              count={summary[statut] ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
