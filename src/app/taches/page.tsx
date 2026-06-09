"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icons";
import type { GraphTask } from "@/types";

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

interface TaskList {
  id: string;
  displayName: string;
}

export default function TachesPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<GraphTask[]>([]);
  const [lists, setLists] = useState<TaskList[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [notConnected, setNotConnected] = useState(false);

  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const [showAddForm, setShowAddForm] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [adding, setAdding] = useState(false);
  const [workspace, setWorkspace] = useState<"pro" | "perso">("pro");

  useEffect(() => {
    const ws = (localStorage.getItem("aria-active-workspace") as "pro" | "perso") ?? "pro";
    setWorkspace(ws);

    fetch(`/api/microsoft/tasks?workspace=${ws}`)
      .then(async (r) => {
        if (r.status === 401) { setNotConnected(true); return; }
        const data = await r.json();
        if (Array.isArray(data)) setTasks(data);
      })
      .finally(() => setLoadingTasks(false));

    fetch(`/api/microsoft/tasks?workspace=${ws}&lists=1`)
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        if (Array.isArray(data)) setLists(data);
      });
  }, []);

  async function completeTask(task: GraphTask) {
    if (!task.listId || completing.has(task.id) || completed.has(task.id)) return;
    setCompleting((prev) => new Set(prev).add(task.id));
    try {
      const res = await fetch(`/api/microsoft/tasks?workspace=${workspace}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: task.listId, taskId: task.id, action: "complete" }),
      });
      if (res.ok) {
        setCompleted((prev) => new Set(prev).add(task.id));
        setTimeout(() => {
          setTasks((prev) => prev.filter((t) => t.id !== task.id));
          setCompleted((prev) => { const s = new Set(prev); s.delete(task.id); return s; });
        }, 800);
      }
    } finally {
      setCompleting((prev) => { const s = new Set(prev); s.delete(task.id); return s; });
    }
  }

  async function deleteTask(task: GraphTask) {
    if (!task.listId) return;
    if (!confirm(`Supprimer "${task.title}" ?`)) return;
    setDeleting((prev) => new Set(prev).add(task.id));
    try {
      const res = await fetch(`/api/microsoft/tasks?workspace=${workspace}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: task.listId, taskId: task.id }),
      });
      if (res.ok) setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } finally {
      setDeleting((prev) => { const s = new Set(prev); s.delete(task.id); return s; });
    }
  }

  async function saveRename(task: GraphTask) {
    if (!task.listId || !editTitle.trim()) { setEditingId(null); return; }
    try {
      const res = await fetch(`/api/microsoft/tasks?workspace=${workspace}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: task.listId, taskId: task.id, action: "rename", title: editTitle }),
      });
      if (res.ok) setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, title: editTitle } : t));
    } finally {
      setEditingId(null);
    }
  }

  async function addTask(listId: string) {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/microsoft/tasks?workspace=${workspace}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId, title: newTitle, dueDate: newDue || undefined }),
      });
      if (res.ok) {
        const task = await res.json();
        const list = lists.find((l) => l.id === listId);
        setTasks((prev) => [...prev, { ...task, listName: list?.displayName, listId }]);
        setNewTitle("");
        setNewDue("");
        setShowAddForm(null);
      }
    } finally {
      setAdding(false);
    }
  }

  if (notConnected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)", gap: 16 }}>
        <Icon name="tasks" size={40} style={{ color: "var(--text-muted)" }} />
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", margin: 0 }}>Microsoft 365 non connecté</h2>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>Connectez votre compte pour accéder à vos tâches.</p>
        <button className="btn-primary" onClick={() => router.push("/settings")}>Connecter dans les réglages</button>
      </div>
    );
  }

  const byList = tasks.reduce<Record<string, { listId: string; tasks: GraphTask[] }>>((acc, t) => {
    const name = t.listName || "Tâches";
    if (!acc[name]) acc[name] = { listId: t.listId || "", tasks: [] };
    acc[name].tasks.push(t);
    return acc;
  }, {});

  const emptyLists = lists.filter((l) => !Object.keys(byList).includes(l.displayName));

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <button onClick={() => router.push("/")} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px" }}>
            <Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }} />
            Retour
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>Tâches</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Microsoft To Do</p>
          </div>
        </div>

        {loadingTasks ? (
          <div className="card" style={{ padding: 20 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Chargement…</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Object.entries(byList).map(([listName, { listId, tasks: listTasks }]) => (
              <div key={listName} className="card" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <p className="kicker" style={{ margin: 0 }}>{listName}</p>
                  <button
                    className="btn-ghost"
                    onClick={() => { setShowAddForm(showAddForm === listId ? null : listId); setNewTitle(""); setNewDue(""); }}
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "4px 10px" }}
                  >
                    <Icon name="plus" size={13} />
                    Nouvelle tâche
                  </button>
                </div>

                {showAddForm === listId && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                    <input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Titre de la tâche…"
                      onKeyDown={(e) => e.key === "Enter" && addTask(listId)}
                      autoFocus
                      style={{ flex: 1, minWidth: 180, padding: "7px 12px", borderRadius: 8, border: "1.5px solid var(--accent)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", outline: "none" }}
                    />
                    <input
                      type="date"
                      value={newDue}
                      onChange={(e) => setNewDue(e.target.value)}
                      style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", outline: "none" }}
                    />
                    <button className="btn-primary" onClick={() => addTask(listId)} disabled={adding || !newTitle.trim()} style={{ fontSize: 13, padding: "7px 14px" }}>
                      {adding ? "Ajout…" : "Ajouter"}
                    </button>
                    <button className="btn-ghost" onClick={() => setShowAddForm(null)} style={{ fontSize: 13 }}>Annuler</button>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {listTasks.map((task) => {
                    const isDone = completed.has(task.id);
                    const isCompleting = completing.has(task.id);
                    const isDeleting = deleting.has(task.id);
                    const isEditing = editingId === task.id;

                    return (
                      <div
                        key={task.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "9px 4px",
                          borderBottom: "1px solid var(--border)", opacity: isDone || isDeleting ? 0.4 : 1,
                          transition: "opacity 0.3s",
                        }}
                      >
                        <button
                          onClick={() => completeTask(task)}
                          disabled={isDone || isCompleting}
                          title="Marquer comme fait"
                          style={{
                            width: 18, height: 18, borderRadius: 5,
                            border: `2px solid ${isDone ? "var(--success)" : "var(--border)"}`,
                            background: isDone ? "var(--success)" : "transparent",
                            flexShrink: 0, cursor: isDone ? "default" : "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.2s",
                          }}
                        >
                          {isDone && <span style={{ color: "white", fontSize: 10 }}>✓</span>}
                        </button>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          {isEditing ? (
                            <input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onBlur={() => saveRename(task)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveRename(task); if (e.key === "Escape") setEditingId(null); }}
                              autoFocus
                              style={{ width: "100%", padding: "3px 8px", borderRadius: 6, border: "1.5px solid var(--accent)", background: "var(--bg)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", outline: "none" }}
                            />
                          ) : (
                            <p
                              style={{ margin: 0, fontSize: 14, color: "var(--text)", fontWeight: 500, textDecoration: isDone ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                              title="Double-cliquer pour renommer"
                            >
                              {task.title}
                            </p>
                          )}
                          {task.dueDateTime && (
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
                              Échéance : {formatDue(task.dueDateTime)}
                            </p>
                          )}
                        </div>

                        <span style={{
                          fontSize: 11, fontWeight: 600, color: importanceColor(task.importance),
                          padding: "2px 7px", borderRadius: 999,
                          background: task.importance === "high" ? "var(--accent-soft)" : "var(--surface-2)",
                          flexShrink: 0,
                        }}>
                          {importanceLabel(task.importance)}
                        </span>

                        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                          <button
                            className="btn-ghost"
                            onClick={() => { setEditingId(task.id); setEditTitle(task.title); }}
                            title="Renommer"
                            style={{ padding: "4px 6px", opacity: 0.6 }}
                          >
                            <Icon name="edit" size={13} />
                          </button>
                          <button
                            className="btn-ghost"
                            onClick={() => deleteTask(task)}
                            title="Supprimer"
                            style={{ padding: "4px 6px", color: "var(--accent)", opacity: 0.7 }}
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {emptyLists.map((list) => (
              <div key={list.id} className="card" style={{ padding: "14px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showAddForm === list.id ? 12 : 0 }}>
                  <p className="kicker" style={{ margin: 0 }}>{list.displayName}</p>
                  <button
                    className="btn-ghost"
                    onClick={() => { setShowAddForm(showAddForm === list.id ? null : list.id); setNewTitle(""); setNewDue(""); }}
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "4px 10px" }}
                  >
                    <Icon name="plus" size={13} />
                    Nouvelle tâche
                  </button>
                </div>
                {showAddForm === list.id ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Titre de la tâche…"
                      onKeyDown={(e) => e.key === "Enter" && addTask(list.id)}
                      autoFocus
                      style={{ flex: 1, minWidth: 180, padding: "7px 12px", borderRadius: 8, border: "1.5px solid var(--accent)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", outline: "none" }}
                    />
                    <input
                      type="date"
                      value={newDue}
                      onChange={(e) => setNewDue(e.target.value)}
                      style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", outline: "none" }}
                    />
                    <button className="btn-primary" onClick={() => addTask(list.id)} disabled={adding || !newTitle.trim()} style={{ fontSize: 13, padding: "7px 14px" }}>
                      {adding ? "Ajout…" : "Ajouter"}
                    </button>
                    <button className="btn-ghost" onClick={() => setShowAddForm(null)} style={{ fontSize: 13 }}>Annuler</button>
                  </div>
                ) : (
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Aucune tâche active.</p>
                )}
              </div>
            ))}

            {tasks.length === 0 && emptyLists.length === 0 && (
              <div className="card" style={{ padding: 20 }}>
                <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Aucune tâche active.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
