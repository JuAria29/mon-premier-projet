"use client";

import { useState, useEffect, useCallback } from "react";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

interface DevisItem {
  id: string;
  reference: string | null;
  titre: string | null;
  client: string | null;
  statut: string;
  montant_ht: number;
  created_at_interfast: string | null;
  created_by: string | null;
}

interface Settings {
  ca_objectif: number;
  commission_commercial: number;
  devis_relance_jours: number;
}

interface AnnualStats {
  ca_reel_ht: number;
  ca_previsionnel_ht: number;
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

export function CommercialBoard({ activites = [], exerciceDebut, exerciceFin }: { activites?: string[]; exerciceDebut?: string; exerciceFin?: string }) {
  const [settings, setSettings] = useState<Settings>({ ca_objectif: 600000, commission_commercial: 8, devis_relance_jours: 30 });
  const [signedData, setSignedData] = useState<{ summary: Record<string, { count: number; total: number }> } | null>(null);
  const [annualStats, setAnnualStats] = useState<AnnualStats>({ ca_reel_ht: 0, ca_previsionnel_ht: 0 });
  const [nonRelances, setNonRelances] = useState<DevisItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "500", statuts: "sent,signed,paid" });
      if (activites.length > 0) params.set("activites", activites.join(","));
      if (exerciceDebut) params.set("debut", exerciceDebut);
      if (exerciceFin) params.set("fin", exerciceFin);
      const devisUrl = `/api/finances/devis?${params}`;
      const statsParams = new URLSearchParams();
      if (exerciceDebut) statsParams.set("debut", exerciceDebut);
      if (exerciceFin) statsParams.set("fin", exerciceFin);
      const [sRes, dRes, statsRes] = await Promise.all([
        fetch("/api/settings").then((r) => r.json()),
        fetch(devisUrl).then((r) => r.json()),
        fetch(`/api/finances/stats?${statsParams}`).then((r) => r.json()),
      ]);

      const s = {
        ca_objectif: Number(sRes.ca_objectif) || 600000,
        commission_commercial: Number(sRes.commission_commercial) || 8,
        devis_relance_jours: Number(sRes.devis_relance_jours) || 30,
      };
      setSettings(s);
      setSignedData(dRes);
      setAnnualStats({
        ca_reel_ht: Number(statsRes.annual?.ca_reel_ht) || 0,
        ca_previsionnel_ht: Number(statsRes.annual?.ca_previsionnel_ht) || 0,
      });

      // Filtre non relancés : envoyés depuis plus de X jours
      const allSent: DevisItem[] = dRes.devis ?? [];
      const nonR = allSent.filter((d) => daysSince(d.created_at_interfast) >= s.devis_relance_jours);
      setNonRelances(nonR);
    } finally {
      setLoading(false);
    }
  }, [activites, exerciceDebut, exerciceFin]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Chargement…</div>;

  const summary = signedData?.summary ?? {};
  const caAccepte = summary.signed?.total ?? 0;  // Devis acceptés uniquement (Facture Envoyée)
  const caEnvoye = summary.sent?.total ?? 0;
  const nbEnvoye = summary.sent?.count ?? 0;
  const rate = settings.commission_commercial / 100;
  const commissionRealisee = annualStats.ca_reel_ht * rate;
  const commissionPrevi = annualStats.ca_previsionnel_ht * rate;
  const manqueAGagner = nonRelances.reduce((s, d) => s + (Number(d.montant_ht) || 0), 0);
  const commissionPotentielle = manqueAGagner * rate;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── KPI Cards ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>

        {/* CA Accepté */}
        <div style={{ flex: 1, minWidth: 150, background: "var(--accent-soft)", border: "1.5px solid var(--accent)", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>CA Accepté</span>
            <InfoTooltip text={"Montant HT des devis acceptés par le client (statut Facture Envoyée).\n\nCe CA est sécurisé — le client a dit oui. La facture a été envoyée mais n'est pas encore payée.\n\nNe comprend pas les devis déjà payés (CA Facturé)."} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>{fmt(caAccepte)}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Devis acceptés en attente de paiement</div>
        </div>

        {/* Commission chantier réalisée */}
        <div style={{ flex: 1, minWidth: 150, background: "#f0faf4", border: "1.5px solid #86efac", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em" }}>Commission réalisée</span>
            <InfoTooltip text={`Commission sur CA chantier déjà facturé (réel).\n\nFormule : CA chantier réel × ${settings.commission_commercial} %\nSource : factures de chantier Interfast.\n\nC'est la commission que vous avez déjà gagnée sur cet exercice.`} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#16a34a" }}>{fmt(commissionRealisee)}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Sur {fmt(annualStats.ca_reel_ht)} CA chantier réel</div>
        </div>

        {/* Commission chantier prévisionnelle */}
        <div style={{ flex: 1, minWidth: 150, background: "#f0f9ff", border: "1.5px solid #93c5fd", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.05em" }}>Commission à venir</span>
            <InfoTooltip text={`Commission sur CA chantier prévisionnel (travaux planifiés non encore facturés).\n\nFormule : CA chantier prévisionnel × ${settings.commission_commercial} %\nSource : planning chantier Interfast.\n\nMontant estimé — dépend de la réalisation effective des chantiers.`} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#2563eb" }}>{fmt(commissionPrevi)}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Sur {fmt(annualStats.ca_previsionnel_ht)} CA prévisionnel</div>
        </div>

        {/* En attente de réponse */}
        <div style={{ flex: 1, minWidth: 150, background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em" }}>En attente de réponse</span>
            <InfoTooltip text={"Devis envoyés aux clients qui n'ont pas encore répondu.\n\nC'est votre pipeline commercial actif. Plus il est élevé, plus le potentiel de CA à transformer est important.\n\nObjectif : transformer ces devis en acceptés avant qu'ils ne refroidissent."} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#7c3aed" }}>{nbEnvoye} devis</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{fmt(caEnvoye)} HT total envoyé</div>
        </div>

        {/* Manque à gagner */}
        <div style={{ flex: 1, minWidth: 150, background: "#fff7ed", border: "1.5px solid #fdba74", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#ea580c", textTransform: "uppercase", letterSpacing: "0.05em" }}>Manque à gagner</span>
            <InfoTooltip text={`Montant HT des devis envoyés depuis plus de ${settings.devis_relance_jours} jours sans retour client.\n\nCes opportunités sont en train de se perdre faute de relance.\n\nPriorité : commencer par les montants les plus élevés.`} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#ea580c" }}>{fmt(manqueAGagner)}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{nonRelances.length} devis non relancés ({fmt(commissionPotentielle)} comm.)</div>
        </div>
      </div>

      {/* ── Devis non relancés ── */}
      <CollapsibleSection
        title={`Devis non relancés — depuis + de ${settings.devis_relance_jours} jours`}
        info={`Liste des devis envoyés sans réponse depuis plus de ${settings.devis_relance_jours} jours.\n\nUne relance augmente significativement le taux de signature. Ignorer ces devis, c'est laisser du CA sur la table.\n\nMode d'emploi : appelez le client, rappelez-lui le devis, proposez d'ajuster si besoin. Classés par montant décroissant — commencez par le haut.`}
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
                    display: "grid", gridTemplateColumns: "90px 1fr 90px 80px",
                    gap: 0, padding: "11px 16px", alignItems: "center",
                    borderBottom: i < nonRelances.length - 1 ? "1px solid var(--border)" : "none",
                    background: urgent ? "#fff7ed" : i % 2 === 0 ? "var(--surface)" : "var(--surface2)",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", fontFamily: "monospace" }}>
                      {d.reference ?? "—"}
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, fontFamily: "inherit", fontWeight: 400 }}>
                        {fmtDate(d.created_at_interfast)}
                      </div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>
                        {d.titre || "—"}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{d.client || "—"}</div>
                      {d.created_by && (
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1, fontStyle: "italic" }}>
                          par {d.created_by}
                        </div>
                      )}
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
