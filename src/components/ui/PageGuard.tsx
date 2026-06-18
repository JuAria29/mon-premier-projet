"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import type { ModuleId, PermissionLevel } from "@/lib/permissions";

interface PageGuardProps {
  module: ModuleId;
  required?: PermissionLevel;
  children: React.ReactNode;
}

/**
 * Redirige vers "/" si l'utilisateur n'a pas le niveau requis sur le module.
 * Affiche rien pendant le chargement.
 */
export function PageGuard({ module, required = "read", children }: PageGuardProps) {
  const router = useRouter();
  const { can, loading } = usePermissions();

  useEffect(() => {
    if (!loading && !can(module, required)) {
      router.replace("/");
    }
  }, [loading, can, module, required, router]);

  if (loading) return null;
  if (!can(module, required)) return null;

  return <>{children}</>;
}
