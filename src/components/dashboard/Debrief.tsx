import type { Task } from "@/types";

interface DebriefProps {
  tasks: Task[];
  demain: { h: string; t: string }[];
}

export function Debrief({ tasks, demain }: DebriefProps) {
  const accomplies = tasks.filter((t) => t.statut === "accompli");
  const deleguees = tasks.filter((t) => t.statut === "detache");

  return (
    <div className="card" style={{ padding: "20px 24px" }}>
      <div className="card-head-row" style={{ marginBottom: 16 }}>
        <span className="kicker">Débrief de la journée</span>
      </div>
      <div className="debrief-grid">
        {/* Ce qui est accompli */}
        <div className="debrief-col">
          <p className="debrief-col-title">Ce qui est accompli</p>
          {accomplies.length === 0 && deleguees.length === 0 ? (
            <p className="empty-note">Aucune tâche clôturée aujourd'hui.</p>
          ) : (
            <ul className="recap-list">
              {accomplies.map((t) => (
                <li key={t.id} className="recap-row">
                  <span className="recap-dot" style={{ background: "var(--success)" }} />
                  <span>{t.titre}</span>
                </li>
              ))}
              {deleguees.map((t) => (
                <li key={t.id} className="recap-row">
                  <span className="recap-dot" style={{ background: "var(--violet)" }} />
                  <span style={{ color: "var(--text-muted)" }}>{t.titre} <em>(délégué)</em></span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Demain en préparation */}
        <div className="debrief-col">
          <p className="debrief-col-title">Demain en préparation</p>
          {demain.length === 0 ? (
            <p className="empty-note">Rien de planifié pour l'instant.</p>
          ) : (
            <ul className="demain-list">
              {demain.map((d, i) => (
                <li key={i} className="demain-row">
                  <span className="demain-h">{d.h}</span>
                  <span>{d.t}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
