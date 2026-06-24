"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageGuard } from "@/components/ui/PageGuard";
import { StrategieBoard } from "@/components/finances/StrategieBoard";
import { CommercialBoard } from "@/components/finances/CommercialBoard";
import { ChantierBoard } from "@/components/finances/ChantierBoard";
import { ParametresBoard } from "@/components/finances/ParametresBoard";

type Tab = "strategie" | "commercial" | "chantiers" | "parametres";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "strategie",   label: "Stratégie",   icon: "📊" },
  { id: "commercial",  label: "Commercial",  icon: "📋" },
  { id: "chantiers",   label: "Chantiers",   icon: "🏗️" },
  { id: "parametres",  label: "Paramètres",  icon: "⚙️" },
];

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

function FinancesInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    return (["strategie", "commercial", "chantiers", "parametres"].includes(t ?? "") ? t : "strategie") as Tab;
  });

  function switchTab(t: Tab) {
    setTab(t);
    router.replace(`/finances?tab=${t}`, { scroll: false });
  }

  return (
    <PageGuard module="finances">
      <div style={{ padding: "24px 24px 48px", maxWidth: 1200, margin: "0 auto" }}>

        {/* ── En-tête ── */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>Pilotage</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Stratégie, commercial, chantiers — vue Aria Énergies
          </p>
        </div>

        {/* ── Onglets ── */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1.5px solid var(--border)", paddingBottom: 0 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              style={{
                padding: "9px 18px",
                border: "none",
                borderBottom: tab === t.id ? "2.5px solid var(--accent)" : "2.5px solid transparent",
                background: "transparent",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? "var(--accent)" : "var(--text-soft)",
                marginBottom: -1.5,
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 6,
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
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SourceBadge source="Interfast" />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Pipeline devis · Commissions · Relances</span>
            </div>
            <CommercialBoard />
          </div>
        )}

        {tab === "chantiers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SourceBadge source="Interfast" />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Suivi des chantiers · Vue par flux</span>
            </div>
            <ChantierBoard />
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
