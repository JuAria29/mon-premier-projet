import { Bar } from "@/components/ui/Bar";
import type { Task, Session } from "@/types";

interface StatusCardProps {
  tasks: Task[];
  session: Session;
}

export function StatusCard({ tasks, session }: StatusCardProps) {
  const accompli = tasks.filter((t) => t.statut === "accompli").length;
  const delegue = tasks.filter((t) => t.statut === "detache").length;
  const enAttente = tasks.filter((t) => t.statut === "a_faire" || t.statut === "sollicitation").length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((accompli / total) * 100) : 0;
  const showBar = session === "midi" || session === "soir";

  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <div className="card-head-row">
        <span className="kicker">Statut du jour</span>
        {showBar && <span className="pct-label">{pct}%</span>}
      </div>
      <div className="status-grid">
        <div className="status-cell">
          <span className="status-v" style={{ color: "var(--success)" }}>{accompli}</span>
          <span className="status-k">Accompli</span>
        </div>
        <div className="status-cell">
          <span className="status-v" style={{ color: "var(--violet)" }}>{delegue}</span>
          <span className="status-k">Délégué</span>
        </div>
        <div className="status-cell">
          <span className="status-v" style={{ color: "var(--info)" }}>{enAttente}</span>
          <span className="status-k">En attente</span>
        </div>
      </div>
      {showBar && (
        <div style={{ marginTop: 12 }}>
          <Bar pct={pct} color="var(--success)" />
        </div>
      )}
    </div>
  );
}
