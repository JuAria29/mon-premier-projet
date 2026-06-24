-- Migration : cache des chantiers Interfast
-- À exécuter dans Supabase SQL Editor

create table if not exists public.interfast_chantiers_cache (
  id                   text primary key,   -- ID numérique Interfast (ex: "73302")
  reference            text,               -- ex: "CH00076"
  titre                text,
  client               text,
  adresse              text,
  statut               text,               -- not_started / ongoing / finished
  date_debut           date,
  date_fin_prevue      date,
  synced_at            timestamptz default now()
);

create index if not exists interfast_chantiers_cache_statut_idx
  on public.interfast_chantiers_cache(statut);

create index if not exists interfast_chantiers_cache_date_debut_idx
  on public.interfast_chantiers_cache(date_debut desc);

create index if not exists interfast_chantiers_cache_client_idx
  on public.interfast_chantiers_cache(client);

alter table public.interfast_chantiers_cache enable row level security;

create policy "Service role full access on chantiers cache"
  on public.interfast_chantiers_cache
  for all to service_role using (true);

create policy "Authenticated users can read chantiers cache"
  on public.interfast_chantiers_cache
  for select to authenticated using (true);
