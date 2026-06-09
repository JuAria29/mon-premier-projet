"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icons";
import type { Objective, ObjectiveLevel } from "@/types";

const LEVELS: { id: ObjectiveLevel; label: string; icon: string }[] = [
  { id: "jour", label: "Aujourd'hui", icon: "sun" },
  { id: "semaine", label: "Cette semaine", icon: "calendar" },
  { id: "mois", label: "Ce mois", icon: "target" },
  { id: "trimestre", label: "Ce trimestre", icon: "flag" },
  { id: "an", label: "Cette année", icon: "bolt" },
  { id: "5ans", label: "Dans 5 ans", icon: "arrowUp" },
];

interface ObjectiveState {
  id?: string;
  texte: string;
  pct: number;
  saving: boolean;
}

export default function ObjectifsPage() {
  const router = useRouter();
  const [objectives, setObjectives] = useState<Record<ObjectiveLevel, ObjectiveState>>(
    () =>
      Object.fromEntries(
        LEVELS.map(({ id }) => [id, { texte: "", pct: 0, saving: false }])
      ) as Record<ObjectiveLevel, ObjectiveState>
  );
  const [loading, setLoading] = useState(true);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    fetch("/api/objectives")
      .then((r) => r.json())
      .then((data: Objective[]) => {
        if (Array.isArray(data)) {
          setObjectives((prev) => {
            const next = { ...prev };
            for (const obj of data) {
              next[obj.level] = { id: obj.id, texte: obj.texte, pct: obj.pct, saving: false };
            }
            return next;
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (level: ObjectiveLevel, texte: string, pct: number) => {
    setObjectives((prev) => ({ ...prev, [level]: { ...prev[level], saving: true } }));
    try {
      const res = await fetch("/api/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, texte, pct }),
      });
      const data = await res.json();
      setObjectives((prev) => ({
        ...prev,
        [level]: { id: data.id, texte, pct, saving: false },
      }));
    } catch {
      setObjectives((prev) => ({ ...prev, [level]: { ...prev[level], saving: false } }));
    }
  }, []);

  function handleChange(level: ObjectiveLevel, field: "texte" | "pct", value: string | number) {
    setObjectives((prev) => {
      const updated = { ...prev[level], [field]: value };
      return { ...prev, [level]: updated };
    });

    clearTimeout(timers.current[level]);
    timers.current[level] = setTimeout(() => {
      setObjectives((prev) => {
        save(level, prev[level].texte, prev[level].pct);
        return prev;
      });
    }, 800);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)" }}>
        <p style={{ color: "var(--text-muted)" }}>Chargement…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <button onClick={() => router.push("/")} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px" }}>
            <Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }} />
            Retour
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>Objectifs</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Vos horizons du quotidien au long terme</p>
          </div>
        </div>

        {LEVELS.map(({ id, label, icon }) => {
          const obj = objectives[id];
          return (
            <div key={id} className="card" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ color: "var(--accent)" }}>
                  <Icon name={icon as Parameters<typeof Icon>[0]["name"]} size={16} />
                </span>
                <p className="kicker" style={{ margin: 0 }}>{label}</p>
                {obj.saving && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>Enregistrement…</span>
                )}
                {!obj.saving && obj.id && (
                  <span style={{ fontSize: 11, color: "var(--success)", marginLeft: "auto" }}>✓ Sauvegardé</span>
                )}
              </div>

              <textarea
                value={obj.texte}
                onChange={(e) => handleChange(id, "texte", e.target.value)}
                placeholder={`Décrivez votre objectif pour ${label.toLowerCase()}…`}
                style={{
                  width: "100%",
                  minHeight: 72,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1.5px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontSize: 14,
                  fontFamily: "inherit",
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>Progression</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={obj.pct}
                  onChange={(e) => handleChange(id, "pct", Number(e.target.value))}
                  style={{ flex: 1, accentColor: "var(--accent)" }}
                />
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--accent)",
                  minWidth: 36,
                  textAlign: "right",
                }}>
                  {obj.pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
