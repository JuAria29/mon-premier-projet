"use client";

import { useEffect, useState } from "react";
import type { UserProfile, ModuleId, PermissionLevel } from "@/lib/permissions";
import { DIRIGEANT_PERMISSIONS } from "@/lib/permissions";

interface UsePermissionsResult {
  profile: UserProfile | null;
  loading: boolean;
  can: (module: ModuleId, required?: PermissionLevel) => boolean;
  level: (module: ModuleId) => PermissionLevel;
  isDirigeant: boolean;
}

export function usePermissions(): UsePermissionsResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: UserProfile | null) => {
        setProfile(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function can(module: ModuleId, required: PermissionLevel = "read"): boolean {
    if (!profile) return false;
    const userLevel = profile.permissions[module] ?? "none";
    const rank: Record<PermissionLevel, number> = { full: 4, write: 3, read: 2, own: 1, none: 0 };
    return rank[userLevel] >= rank[required];
  }

  function level(module: ModuleId): PermissionLevel {
    return profile?.permissions[module] ?? "none";
  }

  const isDirigeant = profile?.role?.slug === "dirigeant";

  return { profile, loading, can, level, isDirigeant };
}
