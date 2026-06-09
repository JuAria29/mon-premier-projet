-- Phase 3 — Aria Coach
-- Exécuter dans Supabase : Dashboard → SQL Editor → New query → coller → Run

CREATE TABLE IF NOT EXISTS objectives (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL DEFAULT 'julien',
  level text NOT NULL CHECK (level IN ('jour','semaine','mois','trimestre','an','5ans')),
  texte text NOT NULL DEFAULT '',
  pct int NOT NULL DEFAULT 0 CHECK (pct BETWEEN 0 AND 100),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS microsoft_tokens (
  user_id text PRIMARY KEY DEFAULT 'julien',
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz DEFAULT now()
);
