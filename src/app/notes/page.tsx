"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icons";
import type { NotePageItem } from "@/types";

interface NoteAnalysis {
  resume: string;
  actions: string[];
  conseil: string;
}

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<NotePageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<NotePageItem | null>(null);
  const [analysis, setAnalysis] = useState<NoteAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<"pro" | "perso">("pro");
  const [ton, setTon] = useState("direct");

  useEffect(() => {
    const ws = (localStorage.getItem("aria-active-workspace") as "pro" | "perso") ?? "pro";
    setWorkspace(ws);

    try {
      const s = localStorage.getItem("aria-settings");
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed.ton) setTon(parsed.ton);
      }
    } catch { /* ignore */ }

    fetch(`/api/microsoft/notes?workspace=${ws}`)
      .then(async (r) => {
        if (r.status === 401) { setNotConnected(true); return; }
        const data = await r.json();
        if (Array.isArray(data)) setNotes(data);
      })
      .finally(() => setLoading(false));
  }, []);

  function selectNote(note: NotePageItem) {
    setSelected(note);
    setAnalysis(null);
    setAnalyzeError(null);
  }

  async function analyzeWithAria() {
    if (!selected) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch("/api/coach/analyze-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: selected.id, title: selected.title, ton, workspace }),
      });
      const data = await res.json();
      if (!res.ok) setAnalyzeError(data.error || "Erreur lors de l'analyse");
      else setAnalysis(data);
    } catch {
      setAnalyzeError("Erreur de connexion au serveur");
    } finally {
      setAnalyzing(false);
    }
  }

  if (notConnected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)", gap: 16 }}>
        <Icon name="note" size={40} style={{ color: "var(--text-muted)" }} />
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", margin: 0 }}>Microsoft 365 non connecté</h2>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>Connectez votre compte pour accéder à OneNote.</p>
        <button className="btn-primary" onClick={() => router.push("/settings")}>Connecter dans les réglages</button>
      </div>
    );
  }

  const filtered = notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)" }}>

      {/* Panneau liste */}
      <div style={{ width: 340, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", flexShrink: 0 }}>

        {/* En-tête */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <button onClick={() => router.push("/")} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", fontSize: 13 }}>
              <Icon name="chevron" size={13} style={{ transform: "rotate(180deg)" }} />
              Retour
            </button>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>Notes</h1>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Microsoft OneNote</p>
            </div>
            <a
              href="https://www.onenote.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, textDecoration: "none", color: "var(--text)", padding: "6px 10px" }}
            >
              <Icon name="externalLink" size={13} />
              OneNote
            </a>
          </div>
          <div style={{ position: "relative" }}>
            <Icon name="inbox" size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
        </div>

        {/* Liste */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <p style={{ padding: 20, color: "var(--text-muted)", fontSize: 13 }}>Chargement…</p>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center" }}>
              <Icon name="note" size={28} style={{ color: "var(--text-muted)", marginBottom: 10 }} />
              <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
                {search ? "Aucune note trouvée." : "Aucune note récente."}
              </p>
            </div>
          ) : (
            filtered.map((note) => (
              <button
                key={note.id}
                onClick={() => selectNote(note)}
                style={{
                  width: "100%", padding: "12px 16px", textAlign: "left",
                  background: selected?.id === note.id ? "var(--accent-soft)" : "transparent",
                  border: "none", borderBottom: "1px solid var(--border)",
                  borderLeft: selected?.id === note.id ? "3px solid var(--accent)" : "3px solid transparent",
                  cursor: "pointer",
                }}
              >
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: selected?.id === note.id ? "var(--accent)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {note.title}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
                  {new Date(note.lastModifiedDateTime).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Panneau détail / analyse */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {!selected ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
            <Icon name="note" size={32} style={{ color: "var(--text-muted)" }} />
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Sélectionnez une note pour l&apos;analyser</p>
          </div>
        ) : (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>

            {/* En-tête note */}
            <div className="card" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{selected.title}</h2>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
                    Modifié le {new Date(selected.lastModifiedDateTime).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {selected.webUrl && (
                    <a
                      href={selected.webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost"
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, textDecoration: "none", color: "var(--text)" }}
                    >
                      <Icon name="externalLink" size={14} />
                      Ouvrir dans OneNote
                    </a>
                  )}
                  <button
                    className="btn-primary"
                    onClick={analyzeWithAria}
                    disabled={analyzing}
                    style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
                  >
                    <Icon name="bolt" size={14} />
                    {analyzing ? "Analyse…" : "Analyser avec Aria"}
                  </button>
                </div>
              </div>
            </div>

            {analyzeError && (
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "color-mix(in srgb, var(--accent) 10%, white)", border: "1px solid color-mix(in srgb, var(--accent) 30%, white)" }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--accent)" }}>Erreur : {analyzeError}</p>
              </div>
            )}

            {!analysis && !analyzing && (
              <div className="card" style={{ padding: "32px 24px", textAlign: "center" }}>
                <Icon name="bolt" size={28} style={{ color: "var(--text-muted)", marginBottom: 10 }} />
                <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
                  Cliquez sur &ldquo;Analyser avec Aria&rdquo; pour extraire les actions et obtenir un résumé de cette note.
                </p>
              </div>
            )}

            {analyzing && (
              <div className="card" style={{ padding: "24px", display: "flex", alignItems: "center", gap: 12 }}>
                <Icon name="bolt" size={16} style={{ color: "var(--accent)" }} />
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>Aria lit et analyse la note…</p>
              </div>
            )}

            {/* Résultat analyse */}
            {analysis && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="card" style={{ padding: "16px 20px", borderLeft: "3px solid var(--accent)" }}>
                  <p className="kicker" style={{ marginBottom: 8 }}>Résumé</p>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>{analysis.resume}</p>
                </div>

                {analysis.actions.length > 0 && (
                  <div className="card" style={{ padding: "16px 20px", background: "var(--accent-soft)" }}>
                    <p className="kicker" style={{ marginBottom: 12 }}>Actions identifiées</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {analysis.actions.map((action, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 6 }} />
                          <p style={{ margin: 0, fontSize: 14, color: "var(--text)", lineHeight: 1.5 }}>{action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.conseil && (
                  <div className="card" style={{ padding: "14px 20px" }}>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text)", fontStyle: "italic" }}>💡 {analysis.conseil}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
