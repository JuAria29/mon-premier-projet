"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icons";
import { usePermissions } from "@/hooks/usePermissions";
import type { Workspace } from "@/types";
import type { ModuleId } from "@/lib/permissions";

type NavItem = "dashboard" | "objectifs" | "mails" | "notes" | "taches" | "agenda" | "finances" | "finances-synthese" | "finances-commercial" | "finances-alertes" | "finances-ca" | "finances-poles" | "admin" | "admin-roles";

interface SidebarProps {
  workspace: Workspace;
  onWorkspaceChange: (w: Workspace) => void;
  activeNav: NavItem;
  onNavChange: (n: NavItem) => void;
  userName: string;
  onSettingsOpen: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems: { id: NavItem; label: string; icon: Parameters<typeof Icon>[0]["name"]; module: ModuleId }[] = [
  { id: "dashboard", label: "Aujourd'hui", icon: "home",     module: "dashboard" },
  { id: "objectifs", label: "Objectifs",   icon: "target",   module: "objectifs" },
  { id: "mails",     label: "Mails",       icon: "mail",     module: "mails" },
  { id: "notes",     label: "Notes",       icon: "note",     module: "mails" },
  { id: "taches",    label: "Tâches",      icon: "tasks",    module: "dashboard" },
  { id: "agenda",    label: "Agenda",      icon: "calendar", module: "planning" },
  { id: "finances",  label: "Finances",    icon: "chart",    module: "finances" },
];

export function Sidebar({ workspace, onWorkspaceChange, activeNav, onNavChange, userName, onSettingsOpen, isOpen, onClose }: SidebarProps) {
  const { profile, can, isDirigeant } = usePermissions();
  const [financeOpen, setFinanceOpen] = useState(() => activeNav.startsWith("finances"));

  const initiales = (profile?.full_name ?? userName)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const displayName = profile?.full_name ?? userName;
  const roleLabel = profile?.role?.name ?? "Admin";

  const visibleNavItems = navItems.filter((item) => can(item.module));

  return (
    <aside className={`sidebar${isOpen ? " sidebar-open" : ""}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon">A</div>
        <div className="brand-text">
          <span className="brand-aria">Aria</span>
          <span className="brand-coach">Coach</span>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Fermer le menu">
          <Icon name="close" size={16} />
        </button>
      </div>

      {/* Workspace switcher — uniquement pour le dirigeant */}
      {isDirigeant && (
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
      )}

      {/* Navigation filtrée selon les permissions */}
      <nav className="sidebar-nav">
        {visibleNavItems.map((item) => (
          <div key={item.id}>
            <button
              className={`nav-item${item.id === "finances"
                ? (financeOpen || activeNav.startsWith("finances")) ? " active" : ""
                : activeNav === item.id ? " active" : ""
              }`}
              onClick={() => {
                if (item.id === "finances") {
                  setFinanceOpen((v) => !v);
                } else {
                  onNavChange(item.id);
                }
              }}
            >
              <Icon name={item.icon} size={16} />
              <span>{item.label}</span>
              {item.id === "finances" && (
                <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.5 }}>
                  {financeOpen || activeNav.startsWith("finances") ? "▲" : "▼"}
                </span>
              )}
            </button>

            {/* Sous-navigation Finance */}
            {item.id === "finances" && (financeOpen || activeNav.startsWith("finances")) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 2, marginBottom: 4 }}>
                <button
                  onClick={() => onNavChange("finances-synthese")}
                  style={{
                    padding: "6px 12px 6px 30px", borderRadius: 8, border: "none", cursor: "pointer",
                    textAlign: "left", fontSize: 12, fontWeight: activeNav === "finances-synthese" ? 700 : 500,
                    background: activeNav === "finances-synthese" ? "#fff3ec" : "transparent",
                    color: activeNav === "finances-synthese" ? "var(--accent-strong)" : "var(--text-muted)",
                  }}
                >
                  Synthèse
                </button>
                <button
                  onClick={() => onNavChange("finances-commercial")}
                  style={{
                    padding: "6px 12px 6px 30px", borderRadius: 8, border: "none", cursor: "pointer",
                    textAlign: "left", fontSize: 12, fontWeight: activeNav === "finances-commercial" ? 700 : 500,
                    background: activeNav === "finances-commercial" ? "#fff3ec" : "transparent",
                    color: activeNav === "finances-commercial" ? "var(--accent-strong)" : "var(--text-muted)",
                  }}
                >
                  Commercial
                </button>
                <button
                  onClick={() => onNavChange("finances-alertes")}
                  style={{
                    padding: "5px 12px 5px 42px", borderRadius: 8, border: "none", cursor: "pointer",
                    textAlign: "left", fontSize: 11, fontWeight: activeNav === "finances-alertes" ? 700 : 500,
                    background: activeNav === "finances-alertes" ? "#fff3ec" : "transparent",
                    color: activeNav === "finances-alertes" ? "#dc2626" : "var(--text-muted)",
                  }}
                >
                  ⚠ Alertes
                </button>
                <button
                  onClick={() => onNavChange("finances-ca")}
                  style={{
                    padding: "5px 12px 5px 42px", borderRadius: 8, border: "none", cursor: "pointer",
                    textAlign: "left", fontSize: 11, fontWeight: activeNav === "finances-ca" ? 700 : 500,
                    background: activeNav === "finances-ca" ? "#fff3ec" : "transparent",
                    color: activeNav === "finances-ca" ? "var(--accent-strong)" : "var(--text-muted)",
                  }}
                >
                  CA Vendu
                </button>
                <button
                  onClick={() => onNavChange("finances-poles")}
                  style={{
                    padding: "5px 12px 5px 42px", borderRadius: 8, border: "none", cursor: "pointer",
                    textAlign: "left", fontSize: 11, fontWeight: activeNav === "finances-poles" ? 700 : 500,
                    background: activeNav === "finances-poles" ? "#fff3ec" : "transparent",
                    color: activeNav === "finances-poles" ? "var(--accent-strong)" : "var(--text-muted)",
                  }}
                >
                  Analyse pôles
                </button>
              </div>
            )}
          </div>
        ))}
        {/* Section admin — dirigeant seulement */}
        {isDirigeant && (
          <>
            <div style={{ height: 1, background: "var(--border)", margin: "8px 4px" }} />
            <button
              className={`nav-item${activeNav === "admin" ? " active" : ""}`}
              onClick={() => onNavChange("admin")}
            >
              <Icon name="tasks" size={16} />
              <span>Utilisateurs</span>
            </button>
            <button
              className={`nav-item${activeNav === "admin-roles" ? " active" : ""}`}
              onClick={() => onNavChange("admin-roles")}
            >
              <Icon name="gear" size={16} />
              <span>Rôles</span>
            </button>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="settings-btn" onClick={onSettingsOpen}>
          <Icon name="gear" size={15} />
          <span>Paramètres</span>
        </button>
        <div className="user-chip">
          <div
            className="user-av"
            style={profile?.role?.color ? { background: profile.role.color } : undefined}
          >
            {initiales}
          </div>
          <div className="user-info">
            <span className="user-name">{displayName}</span>
            <span className="user-role">{roleLabel}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
