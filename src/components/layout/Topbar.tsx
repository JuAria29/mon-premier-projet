"use client";

import { Icon } from "@/components/ui/Icons";
import type { Session, Workspace } from "@/types";

interface TopbarProps {
  session: Session;
  onSessionChange: (s: Session) => void;
  workspace: Workspace;
  onSettingsOpen: () => void;
}

const sessions: { id: Session; label: string; icon: Parameters<typeof Icon>[0]["name"] }[] = [
  { id: "matin", label: "Matin", icon: "sun" },
  { id: "midi", label: "Midi", icon: "noon" },
  { id: "soir", label: "Soir", icon: "moon" },
];

function getDateLabel() {
  const now = new Date();
  const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const dayName = days[now.getDay()];
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();

  const startOfYear = new Date(year, 0, 1);
  const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

  return {
    main: `${dayName} ${day} ${month}`,
    sub: `Semaine ${weekNum} · ${year}`,
  };
}

export function Topbar({ session, onSessionChange, workspace, onSettingsOpen }: TopbarProps) {
  const date = getDateLabel();

  return (
    <header className="topbar">
      {/* Date */}
      <div className="topbar-date">
        <span className="td-day">{date.main}</span>
        <span className="td-meta">{date.sub}</span>
      </div>

      {/* Session switcher */}
      <div className="session-switch">
        {sessions.map((s) => (
          <button
            key={s.id}
            className={`sess-btn${session === s.id ? " active" : ""}`}
            onClick={() => onSessionChange(s.id)}
          >
            <Icon name={s.icon} size={14} />
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Right */}
      <div className="topbar-right">
        <div className={`space-chip space-${workspace}`}>
          {workspace === "pro" ? "Aria Énergies" : "Perso"}
        </div>
        <button className="icon-btn" onClick={onSettingsOpen} title="Paramètres">
          <Icon name="gear" size={16} />
        </button>
      </div>
    </header>
  );
}
