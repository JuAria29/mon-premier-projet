"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Icon } from "@/components/ui/Icons";
import type { Workspace } from "@/types";

type NavItem = "dashboard" | "objectifs" | "mails" | "notes" | "taches" | "agenda" | "finances" | "finances-synthese" | "finances-commercial" | "finances-alertes" | "finances-ca" | "finances-poles" | "admin" | "admin-roles";

function pathToNav(pathname: string): NavItem {
  if (pathname.startsWith("/mails"))      return "mails";
  if (pathname.startsWith("/taches"))     return "taches";
  if (pathname.startsWith("/notes"))      return "notes";
  if (pathname.startsWith("/objectifs"))  return "objectifs";
  if (pathname.startsWith("/agenda"))     return "agenda";
  if (pathname.startsWith("/finances"))   return "finances";
  if (pathname.startsWith("/admin/roles")) return "admin-roles";
  if (pathname.startsWith("/admin"))      return "admin";
  return "dashboard";
}

function navToPath(nav: NavItem): string {
  switch (nav) {
    case "mails":               return "/mails";
    case "taches":              return "/taches";
    case "notes":               return "/notes";
    case "objectifs":           return "/objectifs";
    case "agenda":              return "/agenda";
    case "finances":            return "/finances";
    case "finances-synthese":   return "/finances?tab=strategie";
    case "finances-commercial": return "/finances?tab=commercial";
    case "finances-alertes":    return "/finances?tab=commercial";
    case "finances-ca":         return "/finances?tab=commercial";
    case "finances-poles":      return "/finances?tab=commercial";
    case "admin":               return "/admin/utilisateurs";
    case "admin-roles":         return "/admin/roles";
    default:                    return "/";
  }
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace>("pro");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("aria-active-workspace") as Workspace | null;
      setWorkspace(saved === "perso" ? "perso" : "pro");
    } catch { /* ignore */ }
  }, []);

  function handleNavChange(nav: NavItem) {
    setSidebarOpen(false);
    if (nav === "dashboard") { router.push("/"); return; }
    router.push(navToPath(nav));
  }

  function handleWorkspaceChange(w: Workspace) {
    setWorkspace(w);
    try { localStorage.setItem("aria-active-workspace", w); } catch { /* ignore */ }
    router.push("/");
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar
        workspace={workspace}
        onWorkspaceChange={handleWorkspaceChange}
        activeNav={pathToNav(pathname)}
        onNavChange={handleNavChange}
        userName="Julien Pasini"
        onSettingsOpen={() => router.push("/settings")}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main">
        {/* Topbar minimal — hamburger mobile uniquement */}
        <div className="topbar" style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 24px" }}>
          <button
            className="topbar-menu-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Menu"
          >
            <Icon name="close" size={16} style={{ transform: "rotate(45deg) scale(0)" }} />
            <Icon name="home" size={16} />
          </button>
          <button
            onClick={() => router.push("/")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              border: "none", background: "none", cursor: "pointer",
              fontSize: 12, color: "var(--text-muted)", padding: "4px 8px",
              borderRadius: 8, transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <Icon name="home" size={13} />
            Tableau de bord
          </button>
        </div>
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}
