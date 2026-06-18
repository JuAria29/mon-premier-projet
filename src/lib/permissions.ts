export type PermissionLevel = "full" | "write" | "read" | "own" | "none";

export type ModuleId =
  | "dashboard"
  | "finances"
  | "commercial"
  | "planning"
  | "clients"
  | "mails"
  | "objectifs"
  | "export"
  | "admin";

export interface RolePermission {
  module_id: ModuleId;
  level: PermissionLevel;
}

export interface UserRole {
  id: string;
  name: string;
  slug: string;
  color: string;
  is_system: boolean;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole | null;
  permissions: Record<ModuleId, PermissionLevel>;
}

// Ordre de priorité des niveaux (pour comparaison)
const LEVEL_RANK: Record<PermissionLevel, number> = {
  full: 4,
  write: 3,
  read: 2,
  own: 1,
  none: 0,
};

export function canAccess(level: PermissionLevel, required: PermissionLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[required];
}

export function hasModule(permissions: Record<ModuleId, PermissionLevel>, module: ModuleId): boolean {
  return (permissions[module] ?? "none") !== "none";
}

export function getLevel(permissions: Record<ModuleId, PermissionLevel>, module: ModuleId): PermissionLevel {
  return permissions[module] ?? "none";
}

// Permissions par défaut pour le dirigeant (fallback si Supabase inaccessible)
export const DIRIGEANT_PERMISSIONS: Record<ModuleId, PermissionLevel> = {
  dashboard:  "full",
  finances:   "full",
  commercial: "full",
  planning:   "full",
  clients:    "full",
  mails:      "full",
  objectifs:  "full",
  export:     "full",
  admin:      "full",
};
