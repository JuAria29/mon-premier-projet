"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icons";
import type { Mail, MailFolder } from "@/types";

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

function sanitizeHtml(html: string): string {
  return html
    // Remove script + style blocks entirely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    // Strip inline event handlers
    .replace(/\s+on\w+="[^"]*"/gi, "")
    .replace(/\s+on\w+='[^']*'/gi, "")
    // Open all links in new tab safely
    .replace(/<a\s/gi, '<a target="_blank" rel="noopener noreferrer" ');
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const FOLDER_LABELS: Record<string, string> = {
  inbox: "Boîte de réception",
  sentitems: "Éléments envoyés",
  drafts: "Brouillons",
  deleteditems: "Éléments supprimés",
  junkemail: "Courrier indésirable",
  archive: "Archive",
};

function folderLabel(name: string) {
  return FOLDER_LABELS[name.toLowerCase()] || name;
}

export default function MailsPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [mails, setMails] = useState<Mail[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [selected, setSelected] = useState<Mail | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ton, setTon] = useState("direct");

  const [workspace, setWorkspace] = useState<"pro" | "perso">("pro");

  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replySent, setReplySent] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);

  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const moveMenuRef = useRef<HTMLDivElement>(null);

  const [showCompose, setShowCompose] = useState(false);
  const [compose, setCompose] = useState<ComposeState>({ to: "", subject: "", content: "" });
  const [sendingNew, setSendingNew] = useState(false);
  const [newSent, setNewSent] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);

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

    fetch(`/api/microsoft/folders?workspace=${ws}`)
      .then(async (r) => {
        if (r.status === 401) { setNotConnected(true); return; }
        const data = await r.json();
        if (Array.isArray(data)) {
          setFolders(data);
          const inbox = data.find((f: MailFolder) =>
            f.displayName.toLowerCase() === "inbox" ||
            f.displayName.toLowerCase() === "boîte de réception"
          );
          if (inbox) setActiveFolderId(inbox.id);
        }
      })
      .finally(() => setLoadingFolders(false));
  }, []);

  useEffect(() => {
    if (loadingFolders) return;
    fetchMails(activeFolderId);
  }, [activeFolderId, loadingFolders]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) {
        setShowMoveMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function fetchMails(folderId: string | null) {
    setLoading(true);
    setSelected(null);
    setAnalysis(null);
    const ws = (localStorage.getItem("aria-active-workspace") as "pro" | "perso") ?? workspace;
    const url = folderId
      ? `/api/microsoft/mails?workspace=${ws}&folder=${encodeURIComponent(folderId)}`
      : `/api/microsoft/mails?workspace=${ws}`;
    fetch(url)
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
        body: JSON.stringify({ mailId: selected.id, ton, workspace }),
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
    setReplyError(null);
    try {
      const res = await fetch(`/api/microsoft/mails?workspace=${workspace}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", messageId: selected.id, comment: replyText }),
      });
      const data = await res.json();
      if (res.ok) {
        setReplySent(true);
        setReplying(false);
        setTimeout(() => setReplySent(false), 3000);
      } else {
        setReplyError(data.error || "Échec de l'envoi");
      }
    } finally {
      setSendingReply(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!confirm(`Supprimer le mail de "${selected.from}" ?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/microsoft/mails?workspace=${workspace}`, {
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

  async function moveTo(folderId: string) {
    if (!selected) return;
    setShowMoveMenu(false);
    try {
      const res = await fetch(`/api/microsoft/mails?workspace=${workspace}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: selected.id, folderId }),
      });
      if (res.ok) {
        setMails((prev) => prev.filter((m) => m.id !== selected.id));
        setSelected(null);
        setAnalysis(null);
      }
    } catch { /* ignore */ }
  }

  async function sendNew() {
    if (!compose.to.trim() || !compose.subject.trim() || !compose.content.trim()) return;
    setSendingNew(true);
    setNewError(null);
    try {
      const res = await fetch(`/api/microsoft/mails?workspace=${workspace}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "new", to: compose.to, subject: compose.subject, content: compose.content }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewSent(true);
        setCompose({ to: "", subject: "", content: "" });
        setTimeout(() => { setNewSent(false); setShowCompose(false); }, 2000);
      } else {
        setNewError(data.error || "Échec de l'envoi");
      }
    } finally {
      setSendingNew(false);
    }
  }

  if (notConnected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)", gap: 16 }}>
        <Icon name="mail" size={40} style={{ color: "var(--text-muted)" }} />
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", margin: 0 }}>Microsoft 365 non connecté</h2>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>Connectez votre compte dans les paramètres.</p>
        <button className="btn-primary" onClick={() => router.push("/settings")}>Connecter dans les réglages</button>
      </div>
    );
  }

  const foldersForMove = folders.filter((f) => f.id !== activeFolderId);

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", position: "relative" }}>

      {/* Sidebar dossiers */}
      <div style={{ width: 200, borderRight: "1px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => router.push("/")} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", fontSize: 13 }}>
            <Icon name="chevron" size={13} style={{ transform: "rotate(180deg)" }} />
            Retour
          </button>
        </div>
        <div style={{ padding: "10px 8px 8px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px 8px" }}>Dossiers</p>
          {loadingFolders ? (
            <p style={{ fontSize: 12, color: "var(--text-muted)", padding: "4px 8px" }}>Chargement…</p>
          ) : (
            folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setActiveFolderId(folder.id)}
                style={{
                  width: "100%", padding: "7px 10px", textAlign: "left", background: activeFolderId === folder.id ? "var(--accent-soft)" : "transparent",
                  border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                  color: activeFolderId === folder.id ? "var(--accent)" : "var(--text)",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: activeFolderId === folder.id ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {folderLabel(folder.displayName)}
                </span>
                {folder.unreadItemCount > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: "var(--accent)", color: "#fff", borderRadius: 999, padding: "1px 5px", flexShrink: 0 }}>
                    {folder.unreadItemCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
        <div style={{ marginTop: "auto", padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
          <button
            className="btn-primary"
            onClick={() => setShowCompose(true)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, padding: "9px 12px" }}
          >
            <Icon name="plus" size={14} />
            Nouveau mail
          </button>
        </div>
      </div>

      {/* Liste mails */}
      <div style={{ width: 300, borderRight: "1px solid var(--border)", overflowY: "auto", flexShrink: 0, background: "var(--bg)" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              {activeFolderId ? folderLabel(folders.find((f) => f.id === activeFolderId)?.displayName || "") : "Tous les mails"}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>{mails.length} messages</p>
          </div>
        </div>
        {loading ? (
          <p style={{ padding: 20, color: "var(--text-muted)", fontSize: 13 }}>Chargement…</p>
        ) : mails.length === 0 ? (
          <p style={{ padding: 20, color: "var(--text-muted)", fontSize: 13 }}>Aucun message dans ce dossier.</p>
        ) : (
          mails.map((mail) => (
            <button
              key={mail.id}
              onClick={() => { setSelected(mail); setAnalysis(null); setAnalyzeError(null); setReplying(false); setReplySent(false); setReplyError(null); }}
              style={{
                width: "100%", padding: "11px 14px", textAlign: "left",
                background: selected?.id === mail.id ? "var(--accent-soft)" : "transparent",
                cursor: "pointer", border: "none", borderBottom: "1px solid var(--border)",
                borderLeft: selected?.id === mail.id ? "3px solid var(--accent)" : "3px solid transparent",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 2 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                  {mail.from}
                </p>
                <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{formatDate(mail.date)}</span>
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
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Toolbar */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
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

              {/* Déplacer vers */}
              {foldersForMove.length > 0 && (
                <div style={{ position: "relative" }} ref={moveMenuRef}>
                  <button
                    className="btn-ghost"
                    onClick={() => setShowMoveMenu((v) => !v)}
                    style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
                  >
                    <Icon name="moveFolder" size={14} />
                    Déplacer
                    <Icon name="chevronDown" size={12} />
                  </button>
                  {showMoveMenu && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: 10, boxShadow: "0 4px 16px rgba(40,30,20,0.12)",
                      minWidth: 200, overflow: "hidden",
                    }}>
                      {foldersForMove.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => moveTo(f.id)}
                          style={{
                            width: "100%", padding: "8px 14px", textAlign: "left",
                            background: "transparent", border: "none", cursor: "pointer",
                            fontSize: 13, color: "var(--text)",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-soft)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          {folderLabel(f.displayName)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                className="btn-ghost"
                onClick={handleDelete}
                disabled={deleting}
                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--accent)" }}
              >
                <Icon name="trash" size={14} />
                {deleting ? "Suppression…" : "Supprimer"}
              </button>

              {replySent && (
                <span style={{ fontSize: 13, color: "var(--success)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="check" size={13} /> Réponse envoyée
                </span>
              )}
            </div>

            {/* En-tête mail */}
            <div className="card" style={{ padding: "14px 18px" }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{selected.subject}</h2>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap" }}>
                <span>De : <strong style={{ color: "var(--text)" }}>{selected.from}</strong>{selected.fromEmail && ` <${selected.fromEmail}>`}</span>
                <span>{new Date(selected.date).toLocaleString("fr-FR")}</span>
              </div>
            </div>

            {/* Corps */}
            <div className="card" style={{ padding: "14px 18px", overflow: "hidden" }}>
              {selected.bodyContentType === "html" ? (
                <div
                  className="mail-body"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(selected.body) }}
                />
              ) : (
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.75, whiteSpace: "pre-wrap", margin: 0, wordBreak: "break-word" }}>
                  {htmlToPlainText(selected.body)}
                </p>
              )}
            </div>

            {/* Erreur analyse */}
            {analyzeError && (
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "color-mix(in srgb, var(--accent) 10%, white)", border: "1px solid color-mix(in srgb, var(--accent) 30%, white)" }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--accent)" }}>Erreur : {analyzeError}</p>
              </div>
            )}

            {/* Zone réponse */}
            {replying && (
              <div className="card" style={{ padding: "14px 18px" }}>
                <p className="kicker" style={{ marginBottom: 10 }}>Répondre à {selected.from}</p>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={8}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    border: "1.5px solid var(--border)", background: "var(--bg)",
                    color: "var(--text)", fontSize: 13, fontFamily: "inherit",
                    resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.6,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
                {replyError && <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--accent)" }}>{replyError}</p>}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button className="btn-primary" onClick={sendReply} disabled={sendingReply || !replyText.trim()} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <Icon name="send" size={13} />
                    {sendingReply ? "Envoi…" : "Envoyer"}
                  </button>
                  <button className="btn-ghost" onClick={() => setReplying(false)} style={{ fontSize: 13 }}>Annuler</button>
                </div>
              </div>
            )}

            {/* Résultat analyse */}
            {analysis && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="card" style={{ padding: "14px 18px", borderLeft: "3px solid var(--accent)" }}>
                  <p className="kicker" style={{ marginBottom: 8 }}>Résumé Aria</p>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>{analysis.resume}</p>
                </div>

                <div className="card" style={{ padding: "14px 18px", background: "var(--accent-soft)" }}>
                  <p className="kicker" style={{ marginBottom: 8 }}>Action suggérée</p>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--text)", fontWeight: 500 }}>{analysis.action}</p>
                </div>

                <div className="card" style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <p className="kicker" style={{ margin: 0 }}>Brouillon de réponse</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-ghost" onClick={copyBrouillon} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                        <Icon name={copied ? "check" : "note"} size={13} />
                        {copied ? "Copié !" : "Copier"}
                      </button>
                      <button className="btn-primary" onClick={() => { setReplying(true); setReplyText(analysis.brouillon); }} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                        <Icon name="arrowUp" size={12} />
                        Utiliser ce brouillon
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

      {/* Modal Composer */}
      {showCompose && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: 24 }}>
          <div className="card" style={{ width: 520, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Nouveau mail</h3>
              <button className="btn-ghost" onClick={() => setShowCompose(false)} style={{ padding: "4px 8px" }}>
                <Icon name="close" size={16} />
              </button>
            </div>
            <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12, flex: 1, overflowY: "auto" }}>
              {([{ label: "À", key: "to" as const, placeholder: "adresse@email.com" }, { label: "Objet", key: "subject" as const, placeholder: "Objet du mail" }] as const).map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
                  <input
                    value={compose[key]}
                    onChange={(e) => setCompose((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
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
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.6 }}
                />
              </div>
              {newSent && <p style={{ margin: 0, fontSize: 13, color: "var(--success)", display: "flex", alignItems: "center", gap: 6 }}><Icon name="check" size={13} /> Mail envoyé !</p>}
              {newError && <p style={{ margin: 0, fontSize: 13, color: "var(--accent)" }}>Erreur : {newError}</p>}
            </div>
            <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid var(--border)" }}>
              <button
                className="btn-primary"
                onClick={sendNew}
                disabled={sendingNew || !compose.to.trim() || !compose.subject.trim() || !compose.content.trim()}
                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
              >
                <Icon name="send" size={13} />
                {sendingNew ? "Envoi…" : "Envoyer"}
              </button>
              <button className="btn-ghost" onClick={() => setShowCompose(false)} style={{ fontSize: 13 }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
