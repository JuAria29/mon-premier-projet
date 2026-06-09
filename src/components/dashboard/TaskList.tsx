"use client";

import type { Task, TaskStatus } from "@/types";

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
}

const statusOrder: Record<TaskStatus, number> = {
  sollicitation: 0,
  a_faire: 1,
  accompli: 2,
  detache: 3,
};

const prioriteColors: Record<string, string> = {
  urgent: "var(--accent)",
  important: "var(--info)",
  strategique: "var(--violet)",
  courant: "var(--text-faint)",
};

const prioriteLabels: Record<string, string> = {
  urgent: "Urgent",
  important: "Important",
  strategique: "Stratégique",
  courant: "Courant",
};

function formatMin(min: number): string {
  if (min === 0) return "";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m}` : `${h}h`;
}

export function TaskList({ tasks, onToggle }: TaskListProps) {
  const sorted = [...tasks].sort((a, b) => statusOrder[a.statut] - statusOrder[b.statut]);
  const actionCount = tasks.filter((t) => t.statut === "a_faire" || t.statut === "sollicitation").length;

  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <div className="card-head-row">
        <span className="kicker">Tâches clés</span>
        {actionCount > 0 && (
          <span className="count-pill">{actionCount} à traiter</span>
        )}
      </div>
      <div className="task-list">
        {sorted.map((task) => {
          const isDone = task.statut === "accompli" || task.statut === "detache";
          const isSollicitation = task.statut === "sollicitation";
          const color = prioriteColors[task.priorite];

          return (
            <div key={task.id} className={`task-row${isDone ? " is-done" : ""}`}>
              <button
                className={`task-check${task.statut === "accompli" ? " on" : ""}`}
                onClick={() => task.statut !== "detache" && onToggle(task.id)}
                disabled={task.statut === "detache"}
                aria-label="Toggle tâche"
              >
                {task.statut === "accompli" && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              <div className="task-body">
                <div className="task-title-row">
                  <span className="task-title">{task.titre}</span>
                  {task.statut === "detache" && <span className="detache-badge">Délégué</span>}
                </div>
                <div className="task-meta">
                  <span className="task-ctx">
                    {isSollicitation && <span className="ping" />}
                    {task.contexte}
                  </span>
                  {task.min > 0 && <span className="task-time">{formatMin(task.min)}</span>}
                </div>
              </div>
              <span
                className="priorite-badge"
                style={{
                  background: `color-mix(in oklch, ${color} 12%, white)`,
                  color,
                }}
              >
                {prioriteLabels[task.priorite]}
              </span>
            </div>
          );
        })}
        {tasks.length === 0 && (
          <p className="empty-note">Aucune tâche pour aujourd'hui.</p>
        )}
      </div>
    </div>
  );
}
