import { Ring } from "@/components/ui/Ring";
import type { HorizonItem } from "@/types";

interface HorizonStripProps {
  horizons: HorizonItem[];
}

export function HorizonStrip({ horizons }: HorizonStripProps) {
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
