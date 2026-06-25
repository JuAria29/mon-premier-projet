"use client";

import { useState, useEffect, useCallback } from "react";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";

interface DevisItem {
  id: string;
  reference: string | null;
  titre: string | null;
  client: string | null;
  statut: string;
  montant_ht: number;
  created_at_interfast: string | null;
}

interface Settings {
  ca_objectif: number;
  commission_commercial: number;
  devis_relance_jours: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (s: string | null) => {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export function CommercialBoard() {
  const [settings, setSettings] = useState<Settings>({ ca_objectif: 600000, commission_commercial: 8, devis_relance_jours: 30 });
  const [signedData, setSignedData] = useState<{ summary: Record<string, { count: number; total: number }> } | null>(null);
  const [nonRelances, setNonRelances] = useState<DevisItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, dRes] = await Promise.all([
        fetch("/api/settings").then((r) => r.json()),
        fetch("/api/finances/devis?limit=200&statuts=sent").then((r) => r.json()),
      ]);

      const s = {
        ca_objectif: Number(sRes.ca_objectif) || 600000,
        commission_commercial: Number(sRes.commission_commercial) || 8,
        devis_relance_jours: Number(sRes.devis_relance_jours) || 30,
      };
      setSettings(s);
      setSignedData(dRes);

      // Filtre non relancés : envoyés depuis plus de X jours
      const allSent: DevisItem[] = dRes.devis ?? [];
      const nonR = allSent.filter((d) => daysSince(d.created_at_interfast) >= s.devis_relance_jours);
      setNonRelances(nonR);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Chargement…</div>;

  const summary = signedData?.summary ?? {};
  const caSigne = (summary.signed?.total ?? 0) + (summary.paid?.total ?? 0);
  const caEnvoye = summary.sent?.total ?? 0;
  const nbEnvoye = summary.sent?.count ?? 0;
  const commission = caSigne * (settings.commission_commercial / 100);
  const manqueAGagner = nonRelances.reduce((s, d) => s + (Number(d.montant_ht) || 0), 0);
  const commissionPotentielle = manqueAGagner * (settings.commission_commercial / 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── KPI Cards ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 150, background: "var(--accent-soft)", border: "1.5px solid var(--accent)", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>CA Signé</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>{fmt(caSigne)}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Devis acceptés + facturés</div>
        </div>
        <div style={{ flex: 1, minWidth: 150, background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Commission ({settings.commission_commercial} %)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#16a34a" }}>{fmt(commission)}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Sur CA signé</div>
        </div>
        <div style={{ flex: 1, minWidth: 150, background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>En attente de réponse</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#2563eb" }}>{nbEnvoye} devis</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{fmt(caEnvoye)} HT total envoyé</div>
        </div>
        <div style={{ flex: 1, minWidth: 150, background: "#fff7ed", border: "1.5px solid #fdba74", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#ea580c", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Manque à gagner</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#ea580c" }}>{fmt(manqueAGagner)}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{nonRelances.length} devis non relancés ({fmt(commissionPotentielle)} comm.)</div>
        </div>
      </div>

      {/* ── Devis non relancés ── */}
      <CollapsibleSection
        title={`Devis non relancés — depuis + de ${settings.devis_relance_jours} jours`}
        badge={
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: "#fff7ed", color: "#ea580c", border: "1px solid #fdba74", fontWeight: 700 }}>
            {nonRelances.length} devis · {fmt(manqueAGagner)}
          </span>
        }
        storageKey="finances.commercial.relances"
      >
        {nonRelances.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            Aucun devis en attente depuis plus de {settings.devis_relance_jours} jours
          </div>
        ) : (
          <div>
            {nonRelances
              .sort((a, b) => (Number(b.montant_ht) || 0) - (Number(a.montant_ht) || 0))
              .map((d, i) => {
                const days = daysSince(d.created_at_interfast);
                const urgent = days > settings.devis_relance_jours * 2;
                return (
                  <div key={d.id} style={{
                    display: "grid", gridTemplateColumns: "90px 1fr 160px 90px 80px",
                    gap: 0, padding: "11px 16px", alignItems: "center",
                    borderBottom: i < nonRelances.length - 1 ? "1px solid var(--border)" : "none",
                    background: urgent ? "#fff7ed" : i % 2 === 0 ? "var(--surface)" : "var(--surface2)",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", fontFamily: "monospace" }}>
                      {d.reference ?? "—"}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>
                        {d.titre || "—"}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{d.client || "—"}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {fmtDate(d.created_at_interfast)}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, textAlign: "right", color: "var(--text)" }}>
                      {fmt(Number(d.montant_ht) || 0)}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999,
                        background: urgent ? "#fee2e2" : "#fff7ed",
                        color: urgent ? "#dc2626" : "#ea580c",
                        border: `1px solid ${urgent ? "#fca5a5" : "#fdba74"}`,
                        whiteSpace: "nowrap",
                      }}>
                        {days} j
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </CollapsibleSection>

    </div>
  );
}
