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

interface ComposeState {
  to: string;
  subject: string;
  content: string;
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
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ton, setTon] = useState("direct");

  // Reply
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replySent, setReplySent] = useState(false);

  // Delete
  const [deleting, setDeleting] = useState(false);

  // Compose
  const [showCompose, setShowCompose] = useState(false);
  const [compose, setCompose] = useState<ComposeState>({ to: "", subject: "", content: "" });
  const [sendingNew, setSendingNew] = useState(false);
  const [newSent, setNewSent] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem("aria-settings");
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed.ton) setTon(parsed.ton);
      }
    } catch { /* ignore */ }

    fetchMails();
  }, []);

  function fetchMails() {
    setLoading(true);
    fetch("/api/microsoft/mails")
      .then(async (r) => {
        if (r.status === 401) { setNotConnected(true); return; }
        const data = await r.json();
        if (Array.isArray(data)) setMails(data);
      })
      .finally(() => setLoading(false));
  }

  async function analyze() {
    if (!selected) return;
    setAnalyzing(true);
    setAnalysis(null);
    setAnalyzeError(null);
    try {
      const res = await fetch("/api/coach/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mailId: selected.id, ton }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalyzeError(data.error || "Erreur lors de l'analyse");
      } else {
        setAnalysis(data);
        setReplyText(data.brouillon || "");
      }
    } catch {
      setAnalyzeError("Erreur de connexion au serveur");
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

  async function sendReply() {
    if (!selected || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch("/api/microsoft/mails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", messageId: selected.id, comment: replyText }),
      });
      if (res.ok) {
        setReplySent(true);
        setReplying(false);
        setTimeout(() => setReplySent(false), 3000);
      }
    } finally {
      setSendingReply(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!confirm(`Supprimer ce mail de "${selected.from}" ?`)) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/microsoft/mails", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: selected.id }),
      });
      if (res.ok) {
        setMails((prev) => prev.filter((m) => m.id !== selected.id));
        setSelected(null);
        setAnalysis(null);
      }
    } finally {
      setDeleting(false);
    }
  }

  async function sendNew() {
    if (!compose.to.trim() || !compose.subject.trim() || !compose.content.trim()) return;
    setSendingNew(true);
    try {
      const res = await fetch("/api/microsoft/mails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "new", to: compose.to, subject: compose.subject, content: compose.content }),
      });
      if (res.ok) {
        setNewSent(true);
        setCompose({ to: "", subject: "", content: "" });
        setTimeout(() => { setNewSent(false); setShowCompose(false); }, 2000);
      }
    } finally {
      setSendingNew(false);
    }
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
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", flexDirection: "column", position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 24px", borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
        <button onClick={() => router.push("/")} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px" }}>
          <Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }} />
          Retour
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>Outlook</h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{mails.length} messages récents</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowCompose(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
        >
          <Icon name="arrowUp" size={14} />
          Nouveau mail
        </button>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Liste mails */}
        <div style={{ width: 320, borderRight: "1px solid var(--border)", overflowY: "auto", flexShrink: 0 }}>
          {mails.length === 0 ? (
            <p style={{ padding: 24, color: "var(--text-muted)", fontSize: 13 }}>Aucun mail récent.</p>
          ) : (
            mails.map((mail) => (
              <button
                key={mail.id}
                onClick={() => { setSelected(mail); setAnalysis(null); setAnalyzeError(null); setReplying(false); setReplySent(false); }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  textAlign: "left",
                  background: selected?.id === mail.id ? "var(--accent-soft)" : "transparent",
                  cursor: "pointer",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  borderLeft: selected?.id === mail.id ? "3px solid var(--accent)" : "3px solid transparent",
                  transition: "background 0.1s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 2 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {mail.from}
                  </p>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{formatDate(mail.date)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                  {mail.subject}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {mail.preview}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Détail mail */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {!selected ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
              <Icon name="mail" size={32} style={{ color: "var(--text-muted)" }} />
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Sélectionnez un mail à gauche</p>
            </div>
          ) : (
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Toolbar */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="btn-primary"
                  onClick={analyze}
                  disabled={analyzing}
                  style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
                >
                  <Icon name="bolt" size={14} />
                  {analyzing ? "Analyse…" : "Analyser avec Aria"}
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => { setReplying(true); setReplyText(analysis?.brouillon || ""); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
                >
                  <Icon name="arrowUp" size={14} style={{ transform: "rotate(90deg)" }} />
                  Répondre
                </button>
                <button
                  className="btn-ghost"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: deleting ? "var(--text-muted)" : "inherit" }}
                >
                  <Icon name="close" size={14} />
                  {deleting ? "Suppression…" : "Supprimer"}
                </button>
                {replySent && (
                  <span style={{ fontSize: 13, color: "var(--success)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="check" size={13} /> Réponse envoyée
                  </span>
                )}
              </div>

              {/* En-tête mail */}
              <div className="card" style={{ padding: "16px 20px" }}>
                <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{selected.subject}</h2>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)" }}>
                  <span>De : <strong style={{ color: "var(--text)" }}>{selected.from}</strong> {selected.fromEmail && `<${selected.fromEmail}>`}</span>
                  <span>{new Date(selected.date).toLocaleString("fr-FR")}</span>
                </div>
              </div>

              {/* Corps */}
              <div className="card" style={{ padding: "16px 20px" }}>
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>
                  {stripHtml(selected.body).slice(0, 3000)}
                  {selected.body.length > 3000 && "…"}
                </p>
              </div>

              {/* Erreur analyse */}
              {analyzeError && (
                <div style={{ padding: "12px 16px", borderRadius: 10, background: "color-mix(in srgb, var(--accent) 10%, white)", border: "1px solid color-mix(in srgb, var(--accent) 30%, white)" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--accent)" }}>Erreur : {analyzeError}</p>
                </div>
              )}

              {/* Zone réponse */}
              {replying && (
                <div className="card" style={{ padding: "16px 20px" }}>
                  <p className="kicker" style={{ marginBottom: 10 }}>Réponse à {selected.from}</p>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={8}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1.5px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text)",
                      fontSize: 13,
                      fontFamily: "inherit",
                      resize: "vertical",
                      outline: "none",
                      boxSizing: "border-box",
                      lineHeight: 1.6,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      className="btn-primary"
                      onClick={sendReply}
                      disabled={sendingReply || !replyText.trim()}
                      style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
                    >
                      <Icon name="arrowUp" size={13} />
                      {sendingReply ? "Envoi…" : "Envoyer"}
                    </button>
                    <button className="btn-ghost" onClick={() => setReplying(false)} style={{ fontSize: 13 }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Résultat analyse */}
              {analysis && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="card" style={{ padding: "16px 20px", borderLeft: "3px solid var(--accent)" }}>
                    <p className="kicker" style={{ marginBottom: 8 }}>Résumé</p>
                    <p style={{ margin: 0, fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>{analysis.resume}</p>
                  </div>

                  <div className="card" style={{ padding: "16px 20px", background: "var(--accent-soft)" }}>
                    <p className="kicker" style={{ marginBottom: 8 }}>Action suggérée</p>
                    <p style={{ margin: 0, fontSize: 14, color: "var(--text)", fontWeight: 500 }}>{analysis.action}</p>
                  </div>

                  <div className="card" style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <p className="kicker" style={{ margin: 0 }}>Brouillon de réponse</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn-ghost"
                          onClick={copyBrouillon}
                          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
                        >
                          <Icon name={copied ? "check" : "note"} size={13} />
                          {copied ? "Copié !" : "Copier"}
                        </button>
                        <button
                          className="btn-primary"
                          onClick={() => { setReplying(true); setReplyText(analysis.brouillon); }}
                          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
                        >
                          <Icon name="arrowUp" size={12} />
                          Répondre avec ce brouillon
                        </button>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text)", lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                      {analysis.brouillon}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Composer */}
      {showCompose && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100,
          display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: 24,
        }}>
          <div className="card" style={{ width: 520, maxHeight: "85vh", display: "flex", flexDirection: "column", gap: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Nouveau mail</h3>
              <button className="btn-ghost" onClick={() => setShowCompose(false)} style={{ padding: "4px 8px" }}>
                <Icon name="close" size={16} />
              </button>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12, flex: 1, overflowY: "auto" }}>
              {[
                { label: "À", key: "to" as const, placeholder: "adresse@email.com" },
                { label: "Objet", key: "subject" as const, placeholder: "Objet du mail" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
                  <input
                    value={compose[key]}
                    onChange={(e) => setCompose((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{
                      width: "100%", padding: "8px 12px", borderRadius: 8,
                      border: "1.5px solid var(--border)", background: "var(--bg)",
                      color: "var(--text)", fontSize: 13, fontFamily: "inherit",
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Message</label>
                <textarea
                  value={compose.content}
                  onChange={(e) => setCompose((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Votre message…"
                  rows={10}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    border: "1.5px solid var(--border)", background: "var(--bg)",
                    color: "var(--text)", fontSize: 13, fontFamily: "inherit",
                    resize: "vertical", outline: "none", boxSizing: "border-box",
                    lineHeight: 1.6,
                  }}
                />
              </div>
              {newSent && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--success)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="check" size={13} /> Mail envoyé !
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
              <button
                className="btn-primary"
                onClick={sendNew}
                disabled={sendingNew || !compose.to.trim() || !compose.subject.trim() || !compose.content.trim()}
                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
              >
                <Icon name="arrowUp" size={13} />
                {sendingNew ? "Envoi…" : "Envoyer"}
              </button>
              <button className="btn-ghost" onClick={() => setShowCompose(false)} style={{ fontSize: 13 }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
