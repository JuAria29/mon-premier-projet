"use client";

import { useState, ReactNode } from "react";
import { InfoTooltip } from "./InfoTooltip";

interface Props {
  title: ReactNode;
  badge?: ReactNode;
  info?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  storageKey?: string; // conservé pour compatibilité, non utilisé
}

export function CollapsibleSection({ title, badge, info, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  function toggle() {
    setOpen((v) => !v);
  }

  return (
    <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center",
        padding: "12px 16px", background: "var(--surface2)",
        borderBottom: open ? "1.5px solid var(--border)" : "none", gap: 10,
      }}>
        <button
          onClick={toggle}
          style={{
            display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0,
            background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {title}
          </span>
          {badge && <span>{badge}</span>}
        </button>
        {info && (
          <div onClick={(e) => e.stopPropagation()}>
            <InfoTooltip text={info} />
          </div>
        )}
        <button
          onClick={toggle}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", flexShrink: 0 }}
        >
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transition: "transform 0.2s", transform: open ? "rotate(0deg)" : "rotate(-90deg)", color: "var(--text-muted)" }}
          >
            <path d="M2.5 5L7 9.5L11.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}
