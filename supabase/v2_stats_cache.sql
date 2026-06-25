-- Cache des statistiques Interfast par mois (base pour les vues annuelle/trimestrielle/mensuelle)
drop table if exists public.interfast_stats_cache;
create table public.interfast_stats_cache (
  id                    text primary key,   -- format "2025-10" (YYYY-MM)
  debut                 date not null,
  fin                   date not null,
  -- Devis
  devis_signes_ht       numeric default 0,
  devis_reel_ht         numeric default 0,
  devis_previsionnel_ht numeric default 0,
  devis_achats          numeric default 0,
  -- CA
  ca_reel_ht            numeric default 0,
  ca_previsionnel_ht    numeric default 0,
  ca_main_oeuvre        numeric default 0,
  ca_fournitures        numeric default 0,
  ca_en_retard_ht       numeric default 0,
  -- Marge
  marge_reelle          numeric default 0,
  marge_previsionnelle  numeric default 0,
  synced_at             timestamptz default now()
);

create index if not exists interfast_stats_cache_debut_idx
  on public.interfast_stats_cache(debut);

alter table public.interfast_stats_cache enable row level security;

create policy "Service role full access on stats cache"
  on public.interfast_stats_cache for all to service_role using (true);

create policy "Authenticated users can read stats cache"
  on public.interfast_stats_cache for select to authenticated using (true);
