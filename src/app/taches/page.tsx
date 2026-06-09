"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icons";
import type { GraphTask, NotePageItem } from "@/types";

function importanceColor(importance: string) {
  if (importance === "high") return "var(--accent)";
  if (importance === "normal") return "var(--info)";
  return "var(--text-muted)";
}

function importanceLabel(importance: string) {
  if (importance === "high") return "Haute";
  if (importance === "normal") return "Normale";
  return "Faible";
}

function formatDue(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function TachesPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<GraphTask[]>([]);
  const [notes, setNotes] = useState<NotePageItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [notConnected, setNotConnected] = useState(false);

  useEffect(() => {
    fetch("/api/microsoft/tasks")
      .then(async (r) => {
        if (r.status === 401) { setNotConnected(true); return; }
        const data = await r.json();
        if (Array.isArray(data)) setTasks(data);
      })
      .finally(() => setLoadingTasks(false));

    fetch("/api/microsoft/notes")
      .then(async (r) => {
        if (r.status === 401) return;
        const data = await r.json();
        if (Array.isArray(data)) setNotes(data);
      })
      .finally(() => setLoadingNotes(false));
  }, []);

  if (notConnected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)", gap: 16 }}>
        <Icon name="tasks" size={40} style={{ color: "var(--text-muted)" }} />
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", margin: 0 }}>Microsoft 365 non connecté</h2>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>Connectez votre compte pour accéder à vos tâches et notes.</p>
        <button className="btn-primary" onClick={() => router.push("/settings")}>
          Connecter dans les réglages
        </button>
      </div>
    );
  }

  const byList = tasks.reduce<Record<string, GraphTask[]>>((acc, t) => {
    const list = t.listName || "Tâches";
    if (!acc[list]) acc[list] = [];
    acc[list].push(t);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <button onClick={() => router.push("/")} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px" }}>
            <Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }} />
            Retour
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>Tâches & Notes</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Microsoft To Do + OneNote</p>
          </div>
        </div>

        {/* Microsoft To Do */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Icon name="tasks" size={16} style={{ color: "var(--accent)" }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>Microsoft To Do</h2>
          </div>

          {loadingTasks ? (
            <div className="card" style={{ padding: 20 }}>
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Chargement…</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="card" style={{ padding: 20 }}>
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Aucune tâche active.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {Object.entries(byList).map(([listName, listTasks]) => (
                <div key={listName} className="card" style={{ padding: "16px 20px" }}>
                  <p className="kicker" style={{ marginBottom: 10 }}>{listName}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {listTasks.map((task) => (
                      <div key={task.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ width: 18, height: 18, borderRadius: 5, border: "2px solid var(--border)", flexShrink: 0, marginTop: 1 }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 14, color: "var(--text)", fontWeight: 500 }}>{task.title}</p>
                          {task.dueDateTime && (
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
                              Échéance : {formatDue(task.dueDateTime)}
                            </p>
                          )}
                        </div>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: importanceColor(task.importance),
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: task.importance === "high" ? "var(--accent-soft)" : "var(--surface-2)",
                          flexShrink: 0,
                        }}>
                          {importanceLabel(task.importance)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* OneNote */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Icon name="note" size={16} style={{ color: "var(--accent)" }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>Notes OneNote récentes</h2>
          </div>

          {loadingNotes ? (
            <div className="card" style={{ padding: 20 }}>
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Chargement…</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="card" style={{ padding: 20 }}>
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Aucune note récente.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {notes.map((note, i) => (
                  <div key={note.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < notes.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <Icon name="note" size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: 14, color: "var(--text)", flex: 1 }}>{note.title}</p>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
                      {new Date(note.lastModifiedDateTime).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
