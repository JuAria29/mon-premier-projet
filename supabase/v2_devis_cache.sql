-- ============================================================
-- Aria Coach V2 — Cache des devis individuels Interfast
-- À exécuter dans Supabase SQL Editor
-- ============================================================

create table if not exists public.interfast_devis_cache (
  id                   text primary key,
  reference            text,
  titre                text,
  client               text,
  statut               text,   -- draft / finalized / sent / signed / canceled / refused / paid
  montant_ht           numeric default 0,
  montant_ttc          numeric default 0,
  created_at_interfast date,
  synced_at            timestamptz default now()
);

create index if not exists interfast_devis_cache_statut_idx        on public.interfast_devis_cache(statut);
create index if not exists interfast_devis_cache_created_at_idx    on public.interfast_devis_cache(created_at_interfast desc);
create index if not exists interfast_devis_cache_client_idx        on public.interfast_devis_cache(client);

-- RLS
alter table public.interfast_devis_cache enable row level security;

create policy "Service role full access on devis cache"
  on public.interfast_devis_cache for all to service_role using (true);

create policy "Authenticated users can read devis cache"
  on public.interfast_devis_cache for select to authenticated using (true);
