"use client";

import { PreviewBanner } from "@/components/ui/PreviewBanner";

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PreviewBanner />
      {children}
    </>
  );
}
