"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/",
      redirect: false,
    });

    if (result?.error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
    } else if (result?.url) {
      window.location.href = result.url;
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="w-full max-w-sm p-8 flex flex-col items-center gap-6"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          boxShadow: "var(--shadow-hover)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold"
            style={{ background: "var(--accent)" }}
          >
            A
          </div>
          <div className="flex items-baseline gap-1 text-2xl font-bold tracking-tight">
            <span style={{ color: "var(--text)" }}>Aria</span>
            <span style={{ color: "var(--accent)" }}>Coach</span>
          </div>
        </div>

        {/* Tagline */}
        <p
          className="text-sm text-center leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          Votre assistant coach stratégique personnel.
          <br />
          Connecté à Microsoft 365.
        </p>

        {/* Divider */}
        <div className="w-full h-px" style={{ background: "var(--border)" }} />

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-[13px] font-medium"
              style={{ color: "var(--text-soft)" }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue=""
              className="w-full px-3 py-2.5 text-[14px] rounded-xl outline-none transition-colors"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-[13px] font-medium"
              style={{ color: "var(--text-soft)" }}
            >
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full px-3 py-2.5 text-[14px] rounded-xl outline-none transition-colors"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          {error && (
            <p className="text-[13px] text-center" style={{ color: "#c94b4b" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary mt-1 disabled:opacity-60"
            style={{ borderRadius: "var(--radius-btn)" }}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="text-xs text-center" style={{ color: "var(--text-faint)" }}>
          Accès réservé — compte Aria Énergies
        </p>
      </div>
    </div>
  );
}
