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

  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <div className="card-head-row">
        <span className="kicker">Plan du jour</span>
      </div>
      <div className="dayplan-wrapper">
        {/* Hour markers */}
        <div className="dayplan-hours">
          {hours.map((h) => (
            <div key={h} className="dayplan-hour" style={{ left: `${((h * 60 - START) / TOTAL) * 100}%` }}>
              {h}h
            </div>
          ))}
        </div>
        {/* Timeline track */}
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
      {/* Legend */}
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
