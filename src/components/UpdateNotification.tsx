"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function UpdateNotification() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    let initialVersion: string | null = null;

    async function fetchVersion(): Promise<string | null> {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return null;
        const { version } = await res.json();
        return version as string;
      } catch {
        return null;
      }
    }

    async function init() {
      initialVersion = await fetchVersion();
      if (initialVersion === "dev") return; // no polling in dev
    }

    async function check() {
      if (!initialVersion || initialVersion === "dev") return;
      const current = await fetchVersion();
      if (current && current !== initialVersion) {
        setShowBanner(true);
      }
    }

    init();
    const interval = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  if (!showBanner) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: "#fff",
        border: "1.5px solid var(--border, #e5e0da)",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(40,30,20,0.14)",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        maxWidth: 360,
        animation: "slideUp 0.25s ease",
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "oklch(0.28 0.014 60)" }}>
          Mise à jour disponible
        </p>
        <p style={{ margin: "3px 0 0", fontSize: 12, color: "oklch(0.545 0.012 60)" }}>
          Une nouvelle version d&apos;Aria Coach est prête.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "7px 16px",
            borderRadius: 999,
            background: "#b5612f",
            color: "#fff",
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          Actualiser
        </button>
        <button
          onClick={() => setShowBanner(false)}
          style={{
            padding: "5px 16px",
            borderRadius: 999,
            background: "transparent",
            color: "oklch(0.545 0.012 60)",
            border: "1px solid oklch(0.918 0.006 70)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
