"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icons";
import type { NotePageItem } from "@/types";

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<NotePageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/microsoft/notes")
      .then(async (r) => {
        if (r.status === 401) { setNotConnected(true); return; }
        const data = await r.json();
        if (Array.isArray(data)) setNotes(data);
      })
      .finally(() => setLoading(false));
  }, []);

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

  const filtered = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <button onClick={() => router.push("/")} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px" }}>
            <Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }} />
            Retour
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>Notes</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Microsoft OneNote</p>
          </div>
          <a
            href="https://www.onenote.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, textDecoration: "none", color: "var(--text)" }}
          >
            <Icon name="externalLink" size={14} />
            Ouvrir OneNote
          </a>
        </div>

        {/* Barre de recherche */}
        <div style={{ position: "relative" }}>
          <Icon name="inbox" size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher dans vos notes…"
            style={{
              width: "100%", padding: "10px 14px 10px 38px", borderRadius: 12,
              border: "1.5px solid var(--border)", background: "var(--surface)",
              color: "var(--text)", fontSize: 14, fontFamily: "inherit",
              outline: "none", boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {loading ? (
          <div className="card" style={{ padding: 20 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Chargement…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ padding: 24, textAlign: "center" }}>
            <Icon name="note" size={28} style={{ color: "var(--text-muted)", marginBottom: 10 }} />
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              {search ? "Aucune note trouvée." : "Aucune note récente dans OneNote."}
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: "8px 4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px 12px" }}>
              <Icon name="note" size={15} style={{ color: "var(--accent)" }} />
              <p className="kicker" style={{ margin: 0 }}>{filtered.length} pages récentes</p>
            </div>
            {filtered.map((note, i) => (
              <div
                key={note.id}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "11px 16px",
                  borderTop: i === 0 ? "1px solid var(--border)" : "none",
                  borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <Icon name="note" size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {note.title}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
                    Modifié le {new Date(note.lastModifiedDateTime).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {note.webUrl && (
                    <a
                      href={note.webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost"
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, textDecoration: "none", color: "var(--text)", padding: "5px 10px" }}
                    >
                      <Icon name="externalLink" size={13} />
                      Ouvrir
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
          Les notes OneNote s&apos;ouvrent dans l&apos;application Microsoft OneNote.
        </p>
      </div>
    </div>
  );
}
