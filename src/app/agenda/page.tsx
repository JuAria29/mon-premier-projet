"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icons";
import type { CalendarEvent, MicrosoftCalendar } from "@/types";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function addMonths(d: Date, n: number) {
  const r = new Date(d); r.setMonth(r.getMonth() + n); return r;
}
function startOfWeek(d: Date) {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day));
  r.setHours(0, 0, 0, 0);
  return r;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isSameDayStr(iso: string, d: Date) {
  return isSameDay(new Date(iso), d);
}
function isToday(d: Date) {
  return isSameDay(d, new Date());
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function formatDayFull(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}
function formatDayShort(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
}
function eventDuration(event: CalendarEvent) {
  const ms = new Date(event.end).getTime() - new Date(event.start).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}`;
}

function getMonthGrid(d: Date): Date[] {
  const first = startOfMonth(d);
  const gridStart = startOfWeek(first);
  const days: Date[] = [];
  let cur = new Date(gridStart);
  while (days.length < 42) {
    days.push(new Date(cur));
    cur = addDays(cur, 1);
  }
  return days;
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({ event, onDelete, compact = false }: { event: CalendarEvent; onDelete: (id: string) => void; compact?: boolean }) {
  const color = event.calendarColor || "var(--accent)";
  const cssColor = color.startsWith("#") ? color : "var(--accent)";

  if (compact) {
    return (
      <div
        style={{
          fontSize: 10, fontWeight: 600, padding: "1px 4px", borderRadius: 4,
          background: `color-mix(in srgb, ${cssColor} 20%, white)`,
          color: cssColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          cursor: "default",
        }}
        title={`${event.isAllDay ? "Journée" : formatTime(event.start)} — ${event.subject}`}
      >
        {!event.isAllDay && `${formatTime(event.start)} `}{event.subject}
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px",
      borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)",
      borderLeft: `4px solid ${cssColor}`,
    }}>
      <div style={{ flexShrink: 0, textAlign: "center", minWidth: 48 }}>
        {event.isAllDay ? (
          <span style={{ fontSize: 11, fontWeight: 600, color: cssColor, background: `color-mix(in srgb, ${cssColor} 12%, white)`, padding: "2px 6px", borderRadius: 6 }}>Journée</span>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{formatTime(event.start)}</p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>{eventDuration(event)}</p>
          </>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{event.subject}</p>
        {event.location && <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-muted)" }}>📍 {event.location}</p>}
        {event.organizer && <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>{event.organizer}</p>}
        {event.calendarName && (
          <p style={{ margin: "3px 0 0", fontSize: 11, color: cssColor, fontWeight: 500 }}>● {event.calendarName}</p>
        )}
      </div>
      <button
        className="btn-ghost"
        onClick={() => onDelete(event.id)}
        title="Supprimer"
        style={{ flexShrink: 0, padding: "4px 6px", color: "var(--accent)", opacity: 0.6 }}
      >
        <Icon name="trash" size={14} />
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ViewMode = "list" | "day" | "week" | "month";

export default function AgendaPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<MicrosoftCalendar[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [showCalendarPanel, setShowCalendarPanel] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({ subject: "", start: "", end: "", location: "", body: "", calendarId: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [workspace, setWorkspace] = useState<"pro" | "perso">("pro");

  // Load calendars once
  useEffect(() => {
    const ws = (localStorage.getItem("aria-active-workspace") as "pro" | "perso") ?? "pro";
    setWorkspace(ws);
    fetch(`/api/microsoft/calendar?workspace=${ws}&calendars=1`)
      .then(async (r) => {
        if (r.status === 401) { setNotConnected(true); return; }
        const data = await r.json();
        if (Array.isArray(data)) {
          setCalendars(data);
          setSelectedCalendars(new Set(data.map((c: MicrosoftCalendar) => c.id)));
        }
      });
  }, []);

  const fetchEvents = useCallback((date: Date, viewMode: ViewMode, calIds: Set<string>, ws?: string) => {
    setLoading(true);
    let from: Date;
    let to: Date;

    if (viewMode === "day") {
      from = new Date(date); from.setHours(0, 0, 0, 0);
      to = new Date(date); to.setHours(23, 59, 59, 999);
    } else if (viewMode === "week") {
      from = startOfWeek(date);
      to = addDays(from, 7);
    } else if (viewMode === "month") {
      const grid = getMonthGrid(date);
      from = grid[0];
      to = addDays(grid[grid.length - 1], 1);
    } else {
      // list: next 30 days
      from = new Date(); from.setHours(0, 0, 0, 0);
      to = addDays(from, 30);
    }

    const calendarIds = calIds.size > 0 ? Array.from(calIds).join(",") : "";
    const activeWs = ws || (localStorage.getItem("aria-active-workspace") as "pro" | "perso") || "pro";
    const url = `/api/microsoft/calendar?workspace=${activeWs}&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}${calendarIds ? `&calendarIds=${encodeURIComponent(calendarIds)}` : ""}`;

    fetch(url)
      .then(async (r) => {
        if (r.status === 401) { setNotConnected(true); return; }
        const data = await r.json();
        if (Array.isArray(data)) {
          // Enrich with calendar info
          setCalendars((cals) => {
            const calMap = new Map(cals.map((c) => [c.id, c]));
            setEvents(data.map((e: CalendarEvent) => {
              if (e.calendarId) {
                const cal = calMap.get(e.calendarId);
                if (cal) return { ...e, calendarName: cal.name, calendarColor: cal.hexColor || "var(--accent)" };
              }
              return e;
            }));
            return cals;
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchEvents(currentDate, view, selectedCalendars);
  }, [currentDate, view, selectedCalendars, fetchEvents]);

  function toggleCalendar(id: string) {
    setSelectedCalendars((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function deleteEvent(eventId: string) {
    if (!confirm("Supprimer cet événement ?")) return;
    setDeleting((prev) => new Set(prev).add(eventId));
    try {
      const res = await fetch(`/api/microsoft/calendar?workspace=${workspace}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (res.ok) setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } finally {
      setDeleting((prev) => { const s = new Set(prev); s.delete(eventId); return s; });
    }
  }

  async function createEvent() {
    if (!form.subject || !form.start || !form.end) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch(`/api/microsoft/calendar?workspace=${workspace}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, calendarId: form.calendarId || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowCreateForm(false);
        setForm({ subject: "", start: "", end: "", location: "", body: "", calendarId: "" });
        fetchEvents(currentDate, view, selectedCalendars);
      } else {
        setCreateError(data.error || "Erreur lors de la création");
      }
    } finally {
      setCreating(false);
    }
  }

  function navigate(dir: -1 | 1) {
    if (view === "day") setCurrentDate((d) => addDays(d, dir));
    else if (view === "week") setCurrentDate((d) => addDays(d, dir * 7));
    else if (view === "month") setCurrentDate((d) => addMonths(d, dir));
    else setCurrentDate((d) => addDays(d, dir * 30));
  }

  function getPeriodLabel() {
    if (view === "day") return formatDayFull(currentDate);
    if (view === "week") {
      const ws = startOfWeek(currentDate);
      return `${ws.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${addDays(ws, 6).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
    }
    if (view === "month") return currentDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return "30 prochains jours";
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

  // ── Render views ────────────────────────────────────────────────────────────

  function renderList() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const grouped: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      const key = new Date(e.start).toDateString();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    }
    const days = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    if (days.length === 0) return <EmptyState />;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {days.map((dayStr) => {
          const d = new Date(dayStr);
          return (
            <div key={dayStr} className="card" style={{ padding: "14px 20px", borderLeft: `3px solid ${isToday(d) ? "var(--accent)" : "transparent"}` }}>
              <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: isToday(d) ? "var(--accent)" : "var(--text)", textTransform: "capitalize" }}>
                {formatDayFull(d)}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {grouped[dayStr].map((e) => (
                  <EventCard key={e.id} event={e} onDelete={deleteEvent} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderDay() {
    const dayEvents = events.filter((e) => isSameDayStr(e.start, currentDate));
    if (dayEvents.length === 0) return <EmptyState />;
    return (
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {dayEvents.map((e) => <EventCard key={e.id} event={e} onDelete={deleteEvent} />)}
        </div>
      </div>
    );
  }

  function renderWeek() {
    const ws = startOfWeek(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {days.map((day) => {
          const dayEvents = events.filter((e) => isSameDayStr(e.start, day));
          return (
            <div key={day.toISOString()} className="card" style={{ padding: "12px 18px", borderLeft: `3px solid ${isToday(day) ? "var(--accent)" : "transparent"}`, background: isToday(day) ? "var(--accent-soft)" : "var(--surface)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: dayEvents.length > 0 ? 10 : 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isToday(day) ? "var(--accent)" : "var(--text)", textTransform: "capitalize", minWidth: 140 }}>
                  {formatDayFull(day)}
                </p>
                {dayEvents.length === 0 && <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>Aucun événement</p>}
                {dayEvents.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", background: "var(--surface-2)", padding: "1px 7px", borderRadius: 999 }}>{dayEvents.length}</span>}
              </div>
              {dayEvents.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {dayEvents.map((e) => <EventCard key={e.id} event={e} onDelete={deleteEvent} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderMonth() {
    const grid = getMonthGrid(currentDate);
    const weeks: Date[][] = [];
    for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7));
    const dayLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

    return (
      <div className="card" style={{ padding: "14px 16px" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
          {dayLabels.map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", padding: "4px 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {d}
            </div>
          ))}
        </div>
        {/* Grid */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
            {week.map((day) => {
              const dayEvents = events.filter((e) => isSameDayStr(e.start, day));
              const inMonth = day.getMonth() === currentDate.getMonth();
              const todayFlag = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => { setCurrentDate(new Date(day)); setView("day"); }}
                  style={{
                    minHeight: 72, padding: "6px 4px", borderRadius: 8, cursor: "pointer",
                    background: todayFlag ? "var(--accent-soft)" : inMonth ? "var(--surface)" : "transparent",
                    border: `1px solid ${todayFlag ? "var(--accent)" : "var(--border)"}`,
                    opacity: inMonth ? 1 : 0.4,
                  }}
                  onMouseEnter={(e) => { if (!todayFlag) e.currentTarget.style.background = "var(--surface-2)"; }}
                  onMouseLeave={(e) => { if (!todayFlag) e.currentTarget.style.background = inMonth ? "var(--surface)" : "transparent"; }}
                >
                  <p style={{ margin: "0 0 4px 2px", fontSize: 12, fontWeight: todayFlag ? 800 : 500, color: todayFlag ? "var(--accent)" : "var(--text)" }}>
                    {day.getDate()}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {dayEvents.slice(0, 3).map((e) => (
                      <EventCard key={e.id} event={e} onDelete={deleteEvent} compact />
                    ))}
                    {dayEvents.length > 3 && (
                      <p style={{ margin: 0, fontSize: 9, color: "var(--text-muted)", fontWeight: 600 }}>+{dayEvents.length - 3}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  function EmptyState() {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <Icon name="calendar" size={28} style={{ color: "var(--text-muted)", marginBottom: 10 }} />
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Aucun événement sur cette période.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "24px 20px" }}>
      <div style={{ maxWidth: view === "month" ? 1000 : 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => router.push("/")} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px" }}>
            <Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }} />
            Retour
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0 }}>Agenda</h1>
          </div>

          {/* Vue switcher */}
          <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            {(["list", "day", "week", "month"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "7px 14px", fontSize: 13, border: "none", cursor: "pointer",
                  background: view === v ? "var(--accent)" : "transparent",
                  color: view === v ? "#fff" : "var(--text)",
                  fontWeight: view === v ? 700 : 400,
                  transition: "all 0.15s",
                }}
              >
                {{ list: "Liste", day: "Jour", week: "Semaine", month: "Mois" }[v]}
              </button>
            ))}
          </div>

          {/* Calendriers */}
          <div style={{ position: "relative" }}>
            <button
              className="btn-ghost"
              onClick={() => setShowCalendarPanel((v) => !v)}
              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
            >
              <Icon name="calendar" size={14} />
              Calendriers
              {calendars.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, background: "var(--accent)", color: "#fff", borderRadius: 999, padding: "1px 5px" }}>
                  {selectedCalendars.size}/{calendars.length}
                </span>
              )}
              <Icon name="chevronDown" size={12} />
            </button>
            {showCalendarPanel && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
                background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
                boxShadow: "0 4px 20px rgba(40,30,20,0.12)", minWidth: 240, padding: "8px 0",
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "4px 16px 8px" }}>Mes calendriers</p>
                {calendars.length === 0 && (
                  <p style={{ fontSize: 13, color: "var(--text-muted)", padding: "4px 16px 8px" }}>Aucun calendrier trouvé</p>
                )}
                {calendars.map((cal) => (
                  <button
                    key={cal.id}
                    onClick={() => toggleCalendar(cal.id)}
                    style={{
                      width: "100%", padding: "8px 16px", textAlign: "left", background: "transparent",
                      border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-soft)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{
                      width: 14, height: 14, borderRadius: 3,
                      background: selectedCalendars.has(cal.id) ? (cal.hexColor || "var(--accent)") : "transparent",
                      border: `2px solid ${cal.hexColor || "var(--accent)"}`,
                      flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {selectedCalendars.has(cal.id) && <span style={{ color: "#fff", fontSize: 8, fontWeight: 900 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {cal.name}
                        {cal.isDefaultCalendar && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--text-muted)" }}>Principal</span>}
                      </p>
                    </div>
                  </button>
                ))}
                <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0 4px" }}>
                  <button
                    onClick={() => setSelectedCalendars(new Set(calendars.map((c) => c.id)))}
                    style={{ width: "100%", padding: "6px 16px", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", fontSize: 12, color: "var(--accent)" }}
                  >
                    Tout sélectionner
                  </button>
                  <button
                    onClick={() => setSelectedCalendars(new Set())}
                    style={{ width: "100%", padding: "6px 16px", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", fontSize: 12, color: "var(--text-muted)" }}
                  >
                    Tout désélectionner
                  </button>
                </div>
              </div>
            )}
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

        {/* Navigation période */}
        {view !== "list" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
            <button className="btn-ghost" onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }} />
              Précédent
            </button>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text)", textTransform: "capitalize" }}>{getPeriodLabel()}</p>
              <button className="btn-ghost" onClick={() => setCurrentDate(new Date())} style={{ fontSize: 12, padding: "2px 8px", marginTop: 2 }}>
                Aujourd&apos;hui
              </button>
            </div>
            <button className="btn-ghost" onClick={() => navigate(1)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              Suivant
              <Icon name="chevron" size={14} />
            </button>
          </div>
        )}

        {/* Contenu */}
        {loading ? (
          <div className="card" style={{ padding: 20 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Chargement…</p>
          </div>
        ) : (
          <>
            {view === "list" && renderList()}
            {view === "day" && renderDay()}
            {view === "week" && renderWeek()}
            {view === "month" && renderMonth()}
          </>
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
              {([ { label: "Titre *", key: "subject" as const, type: "text", placeholder: "Titre de l'événement" }, { label: "Début *", key: "start" as const, type: "datetime-local", placeholder: "" }, { label: "Fin *", key: "end" as const, type: "datetime-local", placeholder: "" }, { label: "Lieu", key: "location" as const, type: "text", placeholder: "Salle, adresse…" } ]).map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
                  <input type={type} value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}

              {calendars.length > 1 && (
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Calendrier</label>
                  <select
                    value={form.calendarId}
                    onChange={(e) => setForm((p) => ({ ...p, calendarId: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", outline: "none" }}
                  >
                    <option value="">Principal (défaut)</option>
                    {calendars.filter((c) => c.canEdit).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Description</label>
                <textarea value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} placeholder="Description…" rows={3} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.6 }} />
              </div>
              {createError && <p style={{ margin: 0, fontSize: 13, color: "var(--accent)" }}>Erreur : {createError}</p>}
            </div>
            <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid var(--border)" }}>
              <button className="btn-primary" onClick={createEvent} disabled={creating || !form.subject || !form.start || !form.end} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <Icon name="calendar" size={13} />
                {creating ? "Création…" : "Créer"}
              </button>
              <button className="btn-ghost" onClick={() => setShowCreateForm(false)} style={{ fontSize: 13 }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
