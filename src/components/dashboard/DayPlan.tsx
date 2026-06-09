import type { AgendaItem } from "@/types";

interface DayPlanProps {
  agenda: AgendaItem[];
}

const typeColors: Record<AgendaItem["type"], string> = {
  intervention: "var(--accent)",
  technique: "var(--info)",
  commercial: "var(--violet)",
  rh: "var(--success)",
};

const typeLabels: Record<AgendaItem["type"], string> = {
  intervention: "Intervention",
  technique: "Technique",
  commercial: "Commercial",
  rh: "RH",
};

function timeToMinutes(h: string): number {
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
}

const START = 7 * 60;
const END = 20 * 60;
const TOTAL = END - START;

export function DayPlan({ agenda }: DayPlanProps) {
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  if (agenda.length === 0) {
    return (
      <div className="card" style={{ padding: "16px 20px" }}>
        <div className="card-head-row">
          <span className="kicker">Plan du jour</span>
        </div>
        <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-muted)" }}>Aucun événement importé</p>
          <a
            href="/agenda"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 13, fontWeight: 600, color: "var(--accent)",
              textDecoration: "none",
            }}
          >
            Ouvrir l&apos;agenda
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <div className="card-head-row">
        <span className="kicker">Plan du jour</span>
      </div>
      <div className="dayplan-wrapper">
        <div className="dayplan-hours">
          {hours.map((h) => (
            <div key={h} className="dayplan-hour" style={{ left: `${((h * 60 - START) / TOTAL) * 100}%` }}>
              {h}h
            </div>
          ))}
        </div>
        <div className="dayplan-track">
          {agenda.map((item) => {
            const startMin = timeToMinutes(item.h);
            const left = ((startMin - START) / TOTAL) * 100;
            const width = (item.dur / TOTAL) * 100;
            const color = typeColors[item.type];

            return (
              <div
                key={item.id}
                className="dp-event"
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 4)}%`,
                  background: `color-mix(in oklch, ${color} 15%, white)`,
                  borderLeft: `3px solid ${color}`,
                }}
                title={`${item.h} — ${item.titre} (${item.dur}min)`}
              >
                <span className="dp-time">{item.h}</span>
                <span className="dp-titre">{item.titre}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="dayplan-legend">
        {agenda.map((item) => (
          <div key={item.id} className="dp-legend-item">
            <span className="dp-dot" style={{ background: typeColors[item.type] }} />
            <span className="dp-legend-h">{item.h}</span>
            <span className="dp-legend-t">{item.titre}</span>
            <span className="dp-legend-lieu">{item.lieu}</span>
            <span
              className="dp-type-badge"
              style={{
                background: `color-mix(in oklch, ${typeColors[item.type]} 12%, white)`,
                color: typeColors[item.type],
              }}
            >
              {typeLabels[item.type]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
