"use client";

import { Icon } from "@/components/ui/Icons";
import type { Workspace } from "@/types";

type NavItem = "dashboard" | "objectifs" | "mails" | "notes" | "taches" | "agenda";

interface SidebarProps {
  workspace: Workspace;
  onWorkspaceChange: (w: Workspace) => void;
  activeNav: NavItem;
  onNavChange: (n: NavItem) => void;
  userName: string;
  onSettingsOpen: () => void;
}

const navItems: { id: NavItem; label: string; icon: Parameters<typeof Icon>[0]["name"] }[] = [
  { id: "dashboard", label: "Aujourd'hui", icon: "home" },
  { id: "objectifs", label: "Objectifs", icon: "target" },
  { id: "mails", label: "Mails", icon: "mail" },
  { id: "notes", label: "Notes", icon: "note" },
  { id: "taches", label: "Tâches", icon: "tasks" },
  { id: "agenda", label: "Agenda", icon: "calendar" },
];

export function Sidebar({ workspace, onWorkspaceChange, activeNav, onNavChange, userName, onSettingsOpen }: SidebarProps) {
  const initiales = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon">A</div>
        <div className="brand-text">
          <span className="brand-aria">Aria</span>
          <span className="brand-coach">Coach</span>
        </div>
      </div>

      {/* Workspace switcher */}
      <div className="ws-switch">
        <button
          className={`ws-btn${workspace === "pro" ? " active" : ""}`}
          onClick={() => onWorkspaceChange("pro")}
        >
          <Icon name="briefcase" size={14} />
          <span>Pro</span>
        </button>
        <button
          className={`ws-btn${workspace === "perso" ? " active" : ""}`}
          onClick={() => onWorkspaceChange("perso")}
        >
          <Icon name="home" size={14} />
          <span>Perso</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item${activeNav === item.id ? " active" : ""}`}
            onClick={() => onNavChange(item.id)}
          >
            <Icon name={item.icon} size={16} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="settings-btn" onClick={onSettingsOpen}>
          <Icon name="gear" size={15} />
          <span>Paramètres</span>
        </button>
        <div className="user-chip">
          <div className="user-av">{initiales}</div>
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <span className="user-role">Admin</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
