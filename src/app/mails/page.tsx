"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icons";
import type { Mail } from "@/types";

interface Analysis {
  resume: string;
  action: string;
  brouillon: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function MailsPage() {
  const router = useRouter();
  const [mails, setMails] = useState<Mail[]>([]);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [selected, setSelected] = useState<Mail | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ton, setTon] = useState("direct");

  useEffect(() => {
    try {
      const s = localStorage.getItem("aria-settings");
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed.ton) setTon(parsed.ton);
      }
    } catch { /* ignore */ }

    fetch("/api/microsoft/mails")
      .then(async (r) => {
        if (r.status === 401) { setNotConnected(true); return; }
        const data = await r.json();
        if (Array.isArray(data)) setMails(data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function analyze() {
    if (!selected) return;
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch("/api/coach/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mailId: selected.id, ton }),
      });
      const data = await res.json();
      setAnalysis(data);
    } finally {
      setAnalyzing(false);
    }
  }

  function copyBrouillon() {
    if (!analysis?.brouillon) return;
    navigator.clipboard.writeText(analysis.brouillon);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)" }}>
        <p style={{ color: "var(--text-muted)" }}>Chargement des mails…</p>
      </div>
    );
  }

  if (notConnected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)", gap: 16 }}>
        <Icon name="mail" size={40} style={{ color: "var(--text-muted)" }} />
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", margin: 0 }}>Microsoft 365 non connecté</h2>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>Connectez votre compte pour accéder à vos mails Outlook.</p>
        <button className="btn-primary" onClick={() => router.push("/settings")}>
          Connecter dans les réglages
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 24px", borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
        <button onClick={() => router.push("/")} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px" }}>
          <Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }} />
          Retour
        </button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>Outlook</h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{mails.length} messages récents</p>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Liste mails */}
        <div style={{ width: 340, borderRight: "1px solid var(--border)", overflowY: "auto", flexShrink: 0 }}>
          {mails.length === 0 ? (
            <p style={{ padding: 24, color: "var(--text-muted)", fontSize: 13 }}>Aucun mail récent.</p>
          ) : (
            mails.map((mail) => (
              <button
                key={mail.id}
                onClick={() => { setSelected(mail); setAnalysis(null); }}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  textAlign: "left",
                  background: selected?.id === mail.id ? "var(--accent-soft)" : "transparent",
                  cursor: "pointer",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  transition: "background 0.1s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {mail.from}
                  </p>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{formatDate(mail.date)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                  {mail.subject}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {mail.preview}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Détail mail */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {!selected ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
              <Icon name="mail" size={32} style={{ color: "var(--text-muted)" }} />
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Sélectionnez un mail à gauche</p>
            </div>
          ) : (
            <>
              {/* En-tête mail */}
              <div className="card" style={{ padding: "20px 24px" }}>
                <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{selected.subject}</h2>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)" }}>
                  <span>De : <strong style={{ color: "var(--text)" }}>{selected.from}</strong></span>
                  <span>{new Date(selected.date).toLocaleString("fr-FR")}</span>
                </div>
              </div>

              {/* Corps */}
              <div className="card" style={{ padding: "20px 24px" }}>
                <p className="kicker" style={{ marginBottom: 12 }}>Contenu</p>
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>
                  {stripHtml(selected.body).slice(0, 2000)}
                  {selected.body.length > 2000 && "…"}
                </p>
              </div>

              {/* Bouton analyse */}
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className="btn-primary"
                  onClick={analyze}
                  disabled={analyzing}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Icon name="bolt" size={15} />
                  {analyzing ? "Analyse en cours…" : "Analyser avec Aria"}
                </button>
              </div>

              {/* Résultat analyse */}
              {analysis && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="card" style={{ padding: "20px 24px", borderLeft: "3px solid var(--accent)" }}>
                    <p className="kicker" style={{ marginBottom: 8 }}>Résumé</p>
                    <p style={{ margin: 0, fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>{analysis.resume}</p>
                  </div>

                  <div className="card" style={{ padding: "20px 24px", background: "var(--accent-soft)" }}>
                    <p className="kicker" style={{ marginBottom: 8 }}>Action suggérée</p>
                    <p style={{ margin: 0, fontSize: 14, color: "var(--text)", fontWeight: 500 }}>{analysis.action}</p>
                  </div>

                  <div className="card" style={{ padding: "20px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <p className="kicker" style={{ margin: 0 }}>Brouillon de réponse</p>
                      <button
                        className="btn-ghost"
                        onClick={copyBrouillon}
                        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
                      >
                        <Icon name={copied ? "check" : "note"} size={13} />
                        {copied ? "Copié !" : "Copier"}
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text)", lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                      {analysis.brouillon}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
