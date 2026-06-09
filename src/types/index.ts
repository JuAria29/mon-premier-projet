export type Session = "matin" | "midi" | "soir";
export type Workspace = "pro" | "perso";
export type Layout = "equilibre" | "focus" | "dense";
export type Density = "compact" | "regular" | "comfy";
export type TaskStatus = "a_faire" | "accompli" | "detache" | "sollicitation";
export type TaskPriority = "urgent" | "important" | "strategique" | "courant";

export interface Task {
  id: string;
  titre: string;
  contexte: string;
  statut: TaskStatus;
  min: number;
  priorite: TaskPriority;
}

export interface AgendaItem {
  id: string;
  h: string;
  dur: number;
  titre: string;
  lieu: string;
  type: "intervention" | "technique" | "commercial" | "rh";
}

export interface HorizonItem {
  id: string;
  label: string;
  objectif: string;
  pct: number;
}

export interface CoachMessage {
  titre: string;
  corps: string;
  signe: string;
  ton: string;
}

export interface WorkspaceData {
  tasks: Task[];
  agenda: AgendaItem[];
  horizons: HorizonItem[];
  coach: Record<Session, CoachMessage>;
  demain: { h: string; t: string }[];
}

export interface AppSettings {
  ton: "direct" | "chaleureux" | "exigeant";
  layout: Layout;
  density: Density;
}
