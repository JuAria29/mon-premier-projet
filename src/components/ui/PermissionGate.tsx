"use client";

import { usePermissions } from "@/hooks/usePermissions";
import type { ModuleId, PermissionLevel } from "@/lib/permissions";

interface PermissionGateProps {
  module: ModuleId;
  required?: PermissionLevel;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Affiche children si l'utilisateur a le niveau requis sur le module.
 * Sinon affiche fallback (ou rien).
 */
export function PermissionGate({ module, required = "read", fallback = null, children }: PermissionGateProps) {
  const { can, loading } = usePermissions();

  if (loading) return null;
  if (!can(module, required)) return <>{fallback}</>;
  return <>{children}</>;
}
