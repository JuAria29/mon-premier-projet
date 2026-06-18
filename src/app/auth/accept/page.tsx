"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";

export default function AcceptInvitePage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "form" | "success" | "error">("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Supabase gère le token d'invitation dans le hash de l'URL automatiquement
    const supabase = createSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStatus("form");
      } else {
        setStatus("error");
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Mot de passe trop court (8 caractères min.)"); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas"); return; }

    setSaving(true);
    setError(null);
    const supabase = createSupabaseClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setStatus("success");
    setTimeout(() => router.replace("/"), 2000);
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "oklch(0.985 0.005 75)", fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: 24,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "40px 36px", width: "100%", maxWidth: 420,
        border: "1.5px solid oklch(0.918 0.006 70)", boxShadow: "0 4px 24px rgba(40,30,20,0.10)",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#b5612f", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 17 }}>A</div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Aria <span style={{ color: "#b5612f" }}>Coach</span></span>
        </div>

        {status === "loading" && (
          <p style={{ color: "oklch(0.545 0.012 60)", fontSize: 14 }}>Vérification de l'invitation…</p>
        )}

        {status === "error" && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Lien invalide</h1>
            <p style={{ fontSize: 13, color: "oklch(0.545 0.012 60)" }}>Ce lien d'invitation a expiré ou est invalide. Demandez une nouvelle invitation à votre administrateur.</p>
          </>
        )}

        {status === "form" && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Bienvenue sur Aria Coach</h1>
            <p style={{ fontSize: 13, color: "oklch(0.545 0.012 60)", marginBottom: 24 }}>Définissez votre mot de passe pour accéder à votre espace.</p>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "oklch(0.545 0.012 60)", display: "block", marginBottom: 6 }}>
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  required
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid oklch(0.918 0.006 70)", fontSize: 13, fontFamily: "inherit", outline: "none" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "oklch(0.545 0.012 60)", display: "block", marginBottom: 6 }}>
                  Confirmer
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  required
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid oklch(0.918 0.006 70)", fontSize: 13, fontFamily: "inherit", outline: "none" }}
                />
              </div>
              {error && (
                <p style={{ fontSize: 12, color: "#dc2626", background: "#fef2f2", padding: "8px 12px", borderRadius: 8 }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={saving}
                style={{ padding: "11px", borderRadius: 11, background: "#b5612f", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer", opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Enregistrement…" : "Accéder à mon espace"}
              </button>
            </form>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Mot de passe défini</h1>
            <p style={{ fontSize: 13, color: "oklch(0.545 0.012 60)" }}>Redirection vers votre dashboard…</p>
          </>
        )}
      </div>
    </div>
  );
}
