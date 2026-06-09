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
import type { Session, Workspace, Layout, Density, Task, AppSettings } from "@/types";

type NavItem = "dashboard" | "objectifs" | "mails" | "notes" | "taches" | "agenda";

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session>("matin");
  const [workspace, setWorkspace] = useState<Workspace>("pro");
  const [layout, setLayout] = useState<Layout>("equilibre");
  const [density, setDensity] = useState<Density>("regular");
  const [activeNav, setActiveNav] = useState<NavItem>("dashboard");
  const [tasks, setTasks] = useState<Task[]>(mockData.pro.tasks);
  const [ton, setTon] = useState("Direct");

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
  }, []);

  useEffect(() => {
    document.body.className = density;
  }, [density]);

  function handleWorkspaceChange(w: Workspace) {
    setWorkspace(w);
    setTasks(mockData[w].tasks);
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

  const renderDashboard = () => {
    if (session === "soir") {
      return (
        <div className="dash dash-soir">
          <Greeting session={session} userName="Julien Pasini" />
          <div className="two-col">
            <CoachCard message={coachMessage} compact />
            <StatusCard tasks={tasks} session={session} />
          </div>
          <Debrief tasks={tasks} demain={data.demain} />
          <CoachExchange workspace={workspace} ton={ton} />
          <HorizonStrip horizons={data.horizons} />
        </div>
      );
    }

    if (layout === "focus") {
      return (
        <div className="dash dash-focus">
          <Greeting session={session} userName="Julien Pasini" />
          <CoachCard message={coachMessage} />
          <DayPlan agenda={data.agenda} />
          <StatusCard tasks={tasks} session={session} />
          <TaskList tasks={tasks} onToggle={handleToggle} />
          <HorizonStrip horizons={data.horizons} />
        </div>
      );
    }

    if (layout === "dense") {
      return (
        <div className="dash dash-dense">
          <Greeting session={session} userName="Julien Pasini" />
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
          <HorizonStrip horizons={data.horizons} />
        </div>
      );
    }

    return (
      <div className="dash dash-equilibre">
        <Greeting session={session} userName="Julien Pasini" />
        <CoachCard message={coachMessage} />
        <DayPlan agenda={data.agenda} />
        <div className="two-col">
          <TaskList tasks={tasks} onToggle={handleToggle} />
          <StatusCard tasks={tasks} session={session} />
        </div>
        <HorizonStrip horizons={data.horizons} />
      </div>
    );
  };

  return (
    <div className="app-shell">
      <Sidebar
        workspace={workspace}
        onWorkspaceChange={handleWorkspaceChange}
        activeNav={activeNav}
        onNavChange={setActiveNav}
        userName="Julien Pasini"
        onSettingsOpen={() => router.push("/settings")}
      />
      <div className="main">
        <Topbar
          session={session}
          onSessionChange={setSession}
          workspace={workspace}
          onSettingsOpen={() => router.push("/settings")}
        />
        <div className="content">
          {renderDashboard()}
        </div>
      </div>
    </div>
  );
}
