"use client";

import { useState, ReactNode } from "react";

interface Props {
  title: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  storageKey?: string;
}

function readStorage(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  return v === "1";
}

export function CollapsibleSection({ title, badge, defaultOpen = true, children, storageKey }: Props) {
  const [open, setOpen] = useState(() =>
    storageKey ? readStorage(storageKey, defaultOpen) : defaultOpen
  );

  function toggle() {
    const next = !open;
    setOpen(next);
    if (storageKey) localStorage.setItem(storageKey, next ? "1" : "0");
  }

  return (
    <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <button
        onClick={toggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: "var(--surface2)",
          borderBottom: open ? "1.5px solid var(--border)" : "none",
          border: "none", cursor: "pointer", gap: 10, textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {title}
          </span>
          {badge && <span>{badge}</span>}
        </div>
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(0deg)" : "rotate(-90deg)", color: "var(--text-muted)" }}
        >
          <path d="M2.5 5L7 9.5L11.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}
