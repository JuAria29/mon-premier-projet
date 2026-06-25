"use client";

import { useState } from "react";

export function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-flex", lineHeight: 1 }}>
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
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
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 7px)", left: "50%", transform: "translateX(-50%)",
          background: "oklch(0.28 0.014 60)", color: "#fff",
          fontSize: 12, lineHeight: 1.5, padding: "10px 12px", borderRadius: 10,
          whiteSpace: "pre-wrap", minWidth: 220, maxWidth: 280,
          boxShadow: "0 4px 16px rgba(40,30,20,0.22)", zIndex: 200, pointerEvents: "none",
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
