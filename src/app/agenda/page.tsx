"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icons";
import type { CalendarEvent } from "@/types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function isSameDay(a: string, b: Date) {
  const da = new Date(a);
  return da.getFullYear() === b.getFullYear() && da.getMonth() === b.getMonth() && da.getDate() === b.getDate();
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date) {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function eventDuration(event: CalendarEvent) {
  const ms = new Date(event.end).getTime() - new Date(event.start).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}`;
}

export default function AgendaPage() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({ subject: "", start: "", end: "", location: "", body: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const fetchEvents = useCallback((ws: Date) => {
    setLoading(true);
    const from = ws.toISOString();
    const to = addDays(ws, 7).toISOString();
    fetch(`/api/microsoft/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then(async (r) => {
        if (r.status === 401) { setNotConnected(true); return; }
        const data = await r.json();
        if (Array.isArray(data)) setEvents(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchEvents(weekStart);
  }, [weekStart, fetchEvents]);

  async function createEvent() {
    if (!form.subject || !form.start || !form.end) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/microsoft/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setShowCreateForm(false);
        setForm({ subject: "", start: "", end: "", location: "", body: "" });
        fetchEvents(weekStart);
      } else {
        setCreateError(data.error || "Erreur lors de la création");
      }
    } finally {
      setCreating(false);
    }
  }

  async function deleteEvent(eventId: string) {
    if (!confirm("Supprimer cet événement ?")) return;
    setDeleting((prev) => new Set(prev).add(eventId));
    try {
      const res = await fetch("/api/microsoft/calendar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (res.ok) setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } finally {
      setDeleting((prev) => { const s = new Set(prev); s.delete(eventId); return s; });
    }
  }

  if (notConnected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)", gap: 16 }}>
        <Icon name="calendar" size={40} style={{ color: "var(--text-muted)" }} />
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", margin: 0 }}>Microsoft 365 non connecté</h2>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>Connectez votre compte pour accéder à votre agenda.</p>
        <button className="btn-primary" onClick={() => router.push("/settings")}>Connecter dans les réglages</button>
      </div>
    );
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const weekLabel = `${weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} — ${addDays(weekStart, 6).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/")} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px" }}>
            <Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }} />
            Retour
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>Agenda</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Microsoft Calendar</p>
          </div>
          <button
            className="btn-primary"
            onClick={() => setShowCreateForm(true)}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
          >
            <Icon name="plus" size={14} />
            Nouvel événement
          </button>
        </div>

        {/* Navigation semaine */}
        <div className="card" style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button className="btn-ghost" onClick={() => setWeekStart((w) => addDays(w, -7))} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }} />
            Semaine précédente
          </button>
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{weekLabel}</p>
            <button className="btn-ghost" onClick={() => setWeekStart(startOfWeek(new Date()))} style={{ fontSize: 12, padding: "2px 8px", marginTop: 2 }}>
              Aujourd&apos;hui
            </button>
          </div>
          <button className="btn-ghost" onClick={() => setWeekStart((w) => addDays(w, 7))} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            Semaine suivante
            <Icon name="chevron" size={14} />
          </button>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="card" style={{ padding: 20 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Chargement…</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {days.map((day) => {
              const dayEvents = events.filter((e) => isSameDay(e.start, day));
              const isToday = isSameDay(day.toISOString(), new Date());

              return (
                <div
                  key={day.toISOString()}
                  className="card"
                  style={{
                    padding: "14px 20px",
                    borderLeft: isToday ? "3px solid var(--accent)" : "3px solid transparent",
                    background: isToday ? "var(--accent-soft)" : "var(--surface)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: dayEvents.length > 0 ? 12 : 0 }}>
                    <p style={{
                      margin: 0, fontSize: 14, fontWeight: 700,
                      color: isToday ? "var(--accent)" : "var(--text)",
                      textTransform: "capitalize",
                    }}>
                      {formatDay(day.toISOString())}
                    </p>
                    {dayEvents.length === 0 && (
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>Aucun événement</p>
                    )}
                    {dayEvents.length > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", background: "var(--surface-2)", padding: "1px 7px", borderRadius: 999 }}>
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {dayEvents.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: 14, padding: "10px 14px",
                            borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)",
                            opacity: deleting.has(event.id) ? 0.4 : 1, transition: "opacity 0.2s",
                          }}
                        >
                          <div style={{ flexShrink: 0, textAlign: "center", minWidth: 48 }}>
                            {event.isAllDay ? (
                              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--violet)", background: "color-mix(in srgb, var(--violet) 12%, white)", padding: "2px 6px", borderRadius: 6 }}>Journée</span>
                            ) : (
                              <>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{formatTime(event.start)}</p>
                                <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>{eventDuration(event)}</p>
                              </>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{event.subject}</p>
                            {event.location && (
                              <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-muted)" }}>📍 {event.location}</p>
                            )}
                            {event.organizer && (
                              <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>{event.organizer}</p>
                            )}
                            {event.bodyPreview && (
                              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {event.bodyPreview.slice(0, 120)}
                              </p>
                            )}
                          </div>
                          <button
                            className="btn-ghost"
                            onClick={() => deleteEvent(event.id)}
                            disabled={deleting.has(event.id)}
                            title="Supprimer"
                            style={{ flexShrink: 0, padding: "4px 6px", color: "var(--accent)", opacity: 0.6 }}
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal créer événement */}
      {showCreateForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div className="card" style={{ width: 480, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Nouvel événement</h3>
              <button className="btn-ghost" onClick={() => setShowCreateForm(false)} style={{ padding: "4px 8px" }}>
                <Icon name="close" size={16} />
              </button>
            </div>
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12, flex: 1, overflowY: "auto" }}>
              {[
                { label: "Titre *", key: "subject" as const, placeholder: "Titre de l'événement", type: "text" },
                { label: "Début *", key: "start" as const, placeholder: "", type: "datetime-local" },
                { label: "Fin *", key: "end" as const, placeholder: "", type: "datetime-local" },
                { label: "Lieu", key: "location" as const, placeholder: "Salle, adresse…", type: "text" },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Description</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                  placeholder="Description…"
                  rows={3}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.6 }}
                />
              </div>
              {createError && <p style={{ margin: 0, fontSize: 13, color: "var(--accent)" }}>Erreur : {createError}</p>}
            </div>
            <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid var(--border)" }}>
              <button
                className="btn-primary"
                onClick={createEvent}
                disabled={creating || !form.subject || !form.start || !form.end}
                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
              >
                <Icon name="calendar" size={13} />
                {creating ? "Création…" : "Créer l'événement"}
              </button>
              <button className="btn-ghost" onClick={() => setShowCreateForm(false)} style={{ fontSize: 13 }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
