-- Aria Coach V2 — Ajout colonne created_by sur interfast_devis_cache
-- À exécuter dans Supabase SQL Editor

ALTER TABLE public.interfast_devis_cache
  ADD COLUMN IF NOT EXISTS created_by text;
