-- Aria Coach V2 — Colonne activite sur interfast_devis_cache
-- À exécuter dans Supabase SQL Editor

ALTER TABLE public.interfast_devis_cache
  ADD COLUMN IF NOT EXISTS activite text;
-- Valeurs attendues : 'chantier' | 'maintenance' | 'sav' | NULL (non catégorisé)

CREATE INDEX IF NOT EXISTS interfast_devis_cache_activite_idx
  ON public.interfast_devis_cache(activite);

-- ─────────────────────────────────────────────────────────────────
-- Pré-catégorisation automatique par mots-clés dans le titre
-- Adapter les patterns à vos titres de devis réels
-- ─────────────────────────────────────────────────────────────────

-- SAV (dépannage, urgences)
UPDATE public.interfast_devis_cache SET activite = 'sav'
WHERE activite IS NULL AND (
    titre ILIKE '%SAV%'
    OR titre ILIKE '%dépannage%'
    OR titre ILIKE '%depannage%'
    OR titre ILIKE '%urgence%'
    OR titre ILIKE '%réparation%'
    OR titre ILIKE '%reparation%'
    OR titre ILIKE '%panne%'
);

-- Maintenance (contrats, entretien, vérifications)
UPDATE public.interfast_devis_cache SET activite = 'maintenance'
WHERE activite IS NULL AND (
    titre ILIKE '%maintenance%'
    OR titre ILIKE '%entretien%'
    OR titre ILIKE '%contrat%'
    OR titre ILIKE '%visite%'
    OR titre ILIKE '%vérification%'
    OR titre ILIKE '%verification%'
    OR titre ILIKE '%préventif%'
    OR titre ILIKE '%preventif%'
);

-- Chantier (tout le reste — installations, travaux neufs)
-- Décommentez pour passer le reste en 'chantier' automatiquement :
-- UPDATE public.interfast_devis_cache SET activite = 'chantier' WHERE activite IS NULL;
