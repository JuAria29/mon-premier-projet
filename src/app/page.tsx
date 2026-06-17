"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Greeting } from "@/components/dashboard/Greeting";
import { CoachCard } from "@/components/dashboard/CoachCard";
import { DayPlan } from "@/components/dashboard/DayPlan";
import { TaskList } from "@/components/dashboard/TaskList";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { HorizonStrip } from "@/components/dashboard/HorizonStrip";
import { Debrief } from "@/components/dashboard/Debrief";
import { CoachExchange } from "@/components/dashboard/CoachExchange";
import { mockData } from "@/lib/mockData";
import type { Session, Workspace, Layout, Density, Task, AppSettings, Objective, ObjectiveLevel } from "@/types";

type NavItem = "dashboard" | "objectifs" | "mails" | "notes" | "taches" | "agenda" | "finances";

const LEVEL_LABELS: Record<ObjectiveLevel, string> = {
  jour: "Aujourd'hui",
  semaine: "Cette semaine",
  mois: "Ce mois",
  trimestre: "Ce trimestre",
  an: "Cette année",
  "5ans": "Dans 5 ans",
};

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session>("matin");
  const [workspace, setWorkspace] = useState<Workspace>("pro");
  const [layout, setLayout] = useState<Layout>("equilibre");
  const [density, setDensity] = useState<Density>("regular");
  const [activeNav, setActiveNav] = useState<NavItem>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(mockData.pro.tasks);
  const [ton, setTon] = useState("Direct");
  const [realHorizons, setRealHorizons] = useState<{ id: string; label: string; objectif: string; pct: number }[] | null>(null);

  function fetchObjectives(ws: Workspace) {
    fetch(`/api/objectives?workspace=${ws}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: Objective[] | null) => {
        if (!data || !Array.isArray(data) || data.length === 0) {
          setRealHorizons(null);
          return;
        }
        const horizons = data
          .filter((o) => o.texte)
          .map((o) => ({
            id: o.id,
            label: LEVEL_LABELS[o.level] ?? o.level,
            objectif: o.texte,
            pct: o.pct,
          }));
        setRealHorizons(horizons.length > 0 ? horizons : null);
      })
      .catch(() => {});
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem("aria-settings");
      if (saved) {
        const s: AppSettings = JSON.parse(saved);
        if (s.layout) setLayout(s.layout);
        if (s.density) setDensity(s.density);
        if (s.ton) setTon(s.ton.charAt(0).toUpperCase() + s.ton.slice(1));
      }
    } catch {
      // ignore
    }

    try {
      const savedWorkspace = localStorage.getItem("aria-active-workspace") as Workspace | null;
      const ws = (savedWorkspace === "perso" ? "perso" : "pro") as Workspace;
      setWorkspace(ws);
      setTasks(mockData[ws].tasks);

      const colors = localStorage.getItem("aria-workspace-colors");
      if (colors) {
        const c = JSON.parse(colors);
        const accent = c[ws];
        if (accent) document.documentElement.style.setProperty("--accent", accent);
      }
    } catch { /* ignore */ }

    const ws = (localStorage.getItem("aria-active-workspace") as Workspace | null) ?? "pro";
    fetchObjectives(ws === "perso" ? "perso" : "pro");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.className = density;
  }, [density]);

  function handleWorkspaceChange(w: Workspace) {
    setWorkspace(w);
    setTasks(mockData[w].tasks);
    setRealHorizons(null);
    try {
      localStorage.setItem("aria-active-workspace", w);
      const colors = localStorage.getItem("aria-workspace-colors");
      if (colors) {
        const c = JSON.parse(colors);
        const accent = c[w];
        if (accent) document.documentElement.style.setProperty("--accent", accent);
      }
    } catch { /* ignore */ }
    fetchObjectives(w);
  }

  function handleNavChange(nav: NavItem) {
    setSidebarOpen(false);
    setActiveNav(nav);
    if (nav === "mails") router.push("/mails");
    else if (nav === "taches") router.push("/taches");
    else if (nav === "objectifs") router.push("/objectifs");
    else if (nav === "notes") router.push("/notes");
    else if (nav === "agenda") router.push("/agenda");
    else if (nav === "finances") router.push("/finances");
  }

  function handleToggle(id: string) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (t.statut === "accompli") return { ...t, statut: "a_faire" };
        if (t.statut === "a_faire" || t.statut === "sollicitation") return { ...t, statut: "accompli" };
        return t;
      })
    );
  }

  const data = mockData[workspace];
  const coachMessage = { ...data.coach[session], ton };
  const horizons = realHorizons ?? data.horizons;

  const coachRow = (
    <div className="coach-objectives-row">
      <CoachExchange workspace={workspace} ton={ton} session={session} />
      <HorizonStrip horizons={horizons} compact />
    </div>
  );

  const renderDashboard = () => {
    if (session === "soir") {
      return (
        <div className="dash dash-soir">
          <Greeting session={session} userName="Julien Pasini" />
          {coachRow}
          <div className="two-col">
            <CoachCard message={coachMessage} compact />
            <StatusCard tasks={tasks} session={session} />
          </div>
          <Debrief tasks={tasks} demain={data.demain} />
        </div>
      );
    }

    if (layout === "focus") {
      return (
        <div className="dash dash-focus">
          <Greeting session={session} userName="Julien Pasini" />
          {coachRow}
          <CoachCard message={coachMessage} />
          <DayPlan agenda={data.agenda} />
          <StatusCard tasks={tasks} session={session} />
          <TaskList tasks={tasks} onToggle={handleToggle} />
        </div>
      );
    }

    if (layout === "dense") {
      return (
        <div className="dash dash-dense">
          <Greeting session={session} userName="Julien Pasini" />
          {coachRow}
          <div className="two-col">
            <div className="col-stack">
              <CoachCard message={coachMessage} compact />
              <TaskList tasks={tasks} onToggle={handleToggle} />
            </div>
            <div className="col-stack">
              <StatusCard tasks={tasks} session={session} />
              <DayPlan agenda={data.agenda} />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="dash dash-equilibre">
        <Greeting session={session} userName="Julien Pasini" />
        {coachRow}
        <CoachCard message={coachMessage} />
        <DayPlan agenda={data.agenda} />
        <div className="two-col">
          <TaskList tasks={tasks} onToggle={handleToggle} />
          <StatusCard tasks={tasks} session={session} />
        </div>
      </div>
    );
  };

  return (
    <div className="app-shell">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar
        workspace={workspace}
        onWorkspaceChange={handleWorkspaceChange}
        activeNav={activeNav}
        onNavChange={handleNavChange}
        userName="Julien Pasini"
        onSettingsOpen={() => router.push("/settings")}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main">
        <Topbar
          session={session}
          onSessionChange={setSession}
          workspace={workspace}
          onSettingsOpen={() => router.push("/settings")}
          onMenuToggle={() => setSidebarOpen((v) => !v)}
        />
        <div className="content">
          {renderDashboard()}
        </div>
      </div>
    </div>
  );
}
