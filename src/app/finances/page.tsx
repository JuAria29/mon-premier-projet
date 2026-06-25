"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageGuard } from "@/components/ui/PageGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { StrategieBoard } from "@/components/finances/StrategieBoard";
import { CommercialBoard } from "@/components/finances/CommercialBoard";
import { ParametresBoard } from "@/components/finances/ParametresBoard";
import { DevisTable } from "@/components/finances/DevisTable";
import { CAProgressGauge } from "@/components/finances/CAProgressGauge";

type Tab = "strategie" | "commercial" | "parametres";
type Activite = "chantier" | "maintenance" | "sav";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "strategie",   label: "Stratégie",   icon: "📊" },
  { id: "commercial",  label: "Commercial",  icon: "📋" },
  { id: "parametres",  label: "Paramètres",  icon: "⚙️" },
];

const ACTIVITE_CONFIG: Record<Activite, { label: string; color: string; bg: string; border: string }> = {
  chantier:    { label: "Travaux / Chantier", color: "#2563eb", bg: "#dbeafe", border: "#93c5fd" },
  maintenance: { label: "Maintenance",        color: "#d97706", bg: "#fef3c7", border: "#fcd34d" },
  sav:         { label: "SAV",               color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd" },
};

const ALL_ACTIVITES: Activite[] = ["chantier", "maintenance", "sav"];

// Calcule les dates réelles de l'exercice depuis les settings (format MM-DD ou YYYY-MM-DD)
function computeExerciceDates(debutSetting: string, finSetting: string): { debut: string; fin: string } {
  if (/^\d{4}-\d{2}-\d{2}$/.test(debutSetting) && /^\d{4}-\d{2}-\d{2}$/.test(finSetting)) {
    return { debut: debutSetting, fin: finSetting };
  }
  const now = new Date();
  const [debM, debD] = debutSetting.split("-").map(Number);
  const inExercice = now.getMonth() + 1 > debM || (now.getMonth() + 1 === debM && now.getDate() >= debD);
  const y = inExercice ? now.getFullYear() : now.getFullYear() - 1;
  const debut = `${y}-${String(debM).padStart(2, "0")}-${String(debD).padStart(2, "0")}`;
  const [finM, finD] = finSetting.split("-").map(Number);
  const finY = finM < debM ? y + 1 : y;
  const fin = `${finY}-${String(finM).padStart(2, "0")}-${String(finD).padStart(2, "0")}`;
  return { debut, fin };
}

const fmtExercice = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
};

const PERSIST_PREF_KEY = "aria.sections.persist";

function SectionPersistToggle() {
  const [persist, setPersist] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem(PERSIST_PREF_KEY) === "1"
  );

  function toggle() {
    const next = !persist;
    setPersist(next);
    localStorage.setItem(PERSIST_PREF_KEY, next ? "1" : "0");
  }

  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
      <div
        onClick={toggle}
        style={{
          width: 32, height: 18, borderRadius: 999, position: "relative",
          background: persist ? "var(--accent)" : "var(--border)",
          transition: "background 0.2s", flexShrink: 0, cursor: "pointer",
        }}
      >
        <div style={{
          position: "absolute", top: 2, left: persist ? 16 : 2,
          width: 14, height: 14, borderRadius: "50%", background: "#fff",
          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }} />
      </div>
      <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
        Mémoriser les sections
      </span>
    </label>
  );
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
      background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)",
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      {source}
    </span>
  );
}

function ActivityFilter({
  selected,
  onChange,
}: {
  selected: Activite[];
  onChange: (v: Activite[]) => void;
}) {
  const allSelected = selected.length === ALL_ACTIVITES.length;

  function toggle(a: Activite) {
    if (selected.includes(a)) {
      const next = selected.filter((x) => x !== a);
      onChange(next.length === 0 ? ALL_ACTIVITES : next);
    } else {
      onChange([...selected, a]);
    }
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
      background: "var(--surface)", border: "1.5px solid var(--border)",
      borderRadius: 12, padding: "10px 14px",
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>
        Activité
      </span>

      {/* Tous */}
      <button
        onClick={() => onChange(ALL_ACTIVITES)}
        style={{
          padding: "5px 12px", borderRadius: 999, border: "1.5px solid",
          borderColor: allSelected ? "var(--accent)" : "var(--border)",
          background: allSelected ? "var(--accent-soft)" : "var(--surface2)",
          color: allSelected ? "var(--accent)" : "var(--text-muted)",
          fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
          display: "flex", alignItems: "center", gap: 5,
        }}
      >
        {allSelected && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        Tous
      </button>

      <div style={{ width: 1, height: 18, background: "var(--border)", flexShrink: 0 }} />

      {/* Pills par activité */}
      {ALL_ACTIVITES.map((a) => {
        const cfg = ACTIVITE_CONFIG[a];
        const active = selected.includes(a);
        return (
          <button
            key={a}
            onClick={() => toggle(a)}
            style={{
              padding: "5px 12px", borderRadius: 999, border: "1.5px solid",
              borderColor: active ? cfg.color : "var(--border)",
              background: active ? cfg.bg : "var(--surface2)",
              color: active ? cfg.color : "var(--text-muted)",
              fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            {active && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

function FinancesInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    return (["strategie", "commercial", "parametres"].includes(t ?? "") ? t : "strategie") as Tab;
  });
  const [activites, setActivites] = useState<Activite[]>(ALL_ACTIVITES);
  const [exercice, setExercice] = useState<{ debut: string; fin: string } | null>(null);
  const [caObjectif, setCaObjectif] = useState(600000);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setCaObjectif(Number(data.ca_objectif) || 600000);
        setExercice(computeExerciceDates(
          String(data.exercice_debut || "10-01"),
          String(data.exercice_fin || "09-30"),
        ));
      });
  }, []);

  function switchTab(t: Tab) {
    setTab(t);
    router.replace(`/finances?tab=${t}`, { scroll: false });
  }

  // Quand toutes les activités sont sélectionnées → on n'envoie pas de filtre (= tous les devis)
  const activitesParam = activites.length === ALL_ACTIVITES.length ? [] : activites;

  return (
    <PageGuard module="finances">
    <AppLayout>
      <div style={{ padding: "24px 24px 48px", maxWidth: 1200, margin: "0 auto" }}>

        {/* ── En-tête ── */}
        <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>Pilotage</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Stratégie, commercial — vue Aria Énergies
            </p>
          </div>
          <div style={{ paddingTop: 4 }}>
            <SectionPersistToggle />
          </div>
        </div>

        {/* ── Onglets ── */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1.5px solid var(--border)", paddingBottom: 0 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              style={{
                padding: "9px 18px", border: "none",
                borderBottom: tab === t.id ? "2.5px solid var(--accent)" : "2.5px solid transparent",
                background: "transparent", cursor: "pointer", fontSize: 13,
                fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? "var(--accent)" : "var(--text-soft)",
                marginBottom: -1.5, transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Contenu ── */}
        {tab === "strategie" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SourceBadge source="Interfast" />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Données Interfast · Exercice fiscal personnalisable</span>
            </div>
            <StrategieBoard />
          </div>
        )}

        {tab === "commercial" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <SourceBadge source="Interfast" />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Pipeline devis · Commissions · Relances</span>
              </div>
              {exercice && (
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 999, padding: "3px 10px" }}>
                  Exercice {fmtExercice(exercice.debut)} → {fmtExercice(exercice.fin)}
                </span>
              )}
            </div>
            {!exercice && (
              <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Chargement de l'exercice…</div>
            )}
            {exercice && (<>
              <CAProgressGauge
                caObjectif={caObjectif}
                exerciceDebut={exercice.debut}
                exerciceFin={exercice.fin}
                activites={activitesParam}
              />
              <ActivityFilter selected={activites} onChange={setActivites} />
              <CommercialBoard activites={activitesParam} exerciceDebut={exercice.debut} exerciceFin={exercice.fin} />
              <DevisTable activites={activitesParam} exerciceDebut={exercice.debut} exerciceFin={exercice.fin} caObjectif={caObjectif} />
            </>)}
          </div>
        )}

        {tab === "parametres" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SourceBadge source="Aria" />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Objectifs, coefficients, exercice fiscal</span>
            </div>
            <ParametresBoard onSaved={() => {}} />
          </div>
        )}

      </div>
    </AppLayout>
    </PageGuard>
  );
}

export default function FinancesPage() {
  return (
    <Suspense>
      <FinancesInner />
    </Suspense>
  );
}
