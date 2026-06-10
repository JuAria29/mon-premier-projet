import { Ring } from "@/components/ui/Ring";
import type { HorizonItem } from "@/types";

interface HorizonStripProps {
  horizons: HorizonItem[];
  compact?: boolean;
}

export function HorizonStrip({ horizons, compact = false }: HorizonStripProps) {
  if (compact) {
    return (
      <div className="card horizon-card-compact">
        <div className="card-head-row" style={{ padding: "14px 16px 0" }}>
          <span className="kicker">Horizons &amp; objectifs</span>
        </div>
        <div className="horizon-list">
          {horizons.map((h) => (
            <div key={h.id} className="horizon-row">
              <div className="horizon-ring-wrap-sm">
                <Ring pct={h.pct} size={38} stroke={4} />
                <span className="horizon-pct-sm">{h.pct}%</span>
              </div>
              <div className="horizon-text">
                <span className="horizon-label">{h.label}</span>
                <span className="horizon-obj">{h.objectif}</span>
              </div>
            </div>
          ))}
          {horizons.length === 0 && (
            <p className="empty-note" style={{ padding: "16px 0", textAlign: "center" }}>
              Aucun objectif défini
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <div className="card-head-row" style={{ marginBottom: 16 }}>
        <span className="kicker">Horizons &amp; objectifs</span>
      </div>
      <div className="horizon-strip">
        {horizons.map((h) => (
          <div key={h.id} className="horizon-node">
            <div className="horizon-ring-wrap">
              <Ring pct={h.pct} size={48} stroke={5} />
              <span className="horizon-pct">{h.pct}%</span>
            </div>
            <span className="horizon-label">{h.label}</span>
            <span className="horizon-obj">{h.objectif}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
