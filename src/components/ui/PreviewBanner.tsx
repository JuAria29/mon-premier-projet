"use client";

import { useEffect, useState } from "react";

export function PreviewBanner() {
  const [roleName, setRoleName] = useState<string | null>(null);

  useEffect(() => {
    const name = localStorage.getItem("aria-preview-role-name");
    const slug = localStorage.getItem("aria-preview-role");
    if (slug) setRoleName(name ?? slug);
  }, []);

  if (!roleName) return null;

  function quit() {
    localStorage.removeItem("aria-preview-role");
    localStorage.removeItem("aria-preview-role-name");
    window.location.reload();
  }

  return (
    <div style={{
      background: "#fef3c7",
      borderBottom: "1px solid #fbbf24",
      padding: "8px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: 13,
      fontWeight: 500,
      color: "#92400e",
      flexShrink: 0,
    }}>
      <span>
        👁 Mode prévisualisation — <strong>{roleName}</strong>
      </span>
      <button
        onClick={quit}
        style={{
          padding: "4px 14px",
          borderRadius: 8,
          border: "1px solid #f59e0b",
          background: "#fffbeb",
          color: "#92400e",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Retour au mode Dirigeant
      </button>
    </div>
  );
}
