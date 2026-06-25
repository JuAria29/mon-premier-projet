"use client";

import { useState, useRef } from "react";

export function InfoTooltip({ text }: { text: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleMouseEnter() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top });
  }

  return (
    <div style={{ position: "relative", display: "inline-flex", lineHeight: 1 }}>
      <button
        ref={btnRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setPos(null)}
        style={{
          width: 15, height: 15, borderRadius: "50%",
          border: "1px solid var(--border)",
          background: "transparent", cursor: "pointer", padding: 0,
          fontSize: 9, fontWeight: 700, color: "var(--text-muted)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
        aria-label="Plus d'informations"
      >
        i
      </button>
      {pos && (
        <div style={{
          position: "fixed",
          bottom: `calc(100vh - ${pos.y}px + 7px)`,
          left: pos.x,
          transform: "translateX(-50%)",
          background: "oklch(0.28 0.014 60)", color: "#fff",
          fontSize: 12, lineHeight: 1.5, padding: "10px 12px", borderRadius: 10,
          whiteSpace: "pre-wrap", minWidth: 220, maxWidth: 280,
          boxShadow: "0 4px 16px rgba(40,30,20,0.22)", zIndex: 9999, pointerEvents: "none",
        }}>
          {text}
          <div style={{
            position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
            borderTop: "5px solid oklch(0.28 0.014 60)",
          }} />
        </div>
      )}
    </div>
  );
}
