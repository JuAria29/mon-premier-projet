-- Paramètres métier Aria (objectifs, coefficients, exercice fiscal)
create table if not exists public.aria_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz default now()
);

insert into public.aria_settings (key, value) values
  ('ca_objectif',             '600000'),
  ('exercice_debut',          '"10-01"'),
  ('exercice_fin',            '"09-30"'),
  ('fg_coefficient',          '35'),
  ('commission_commercial',   '8'),
  ('devis_relance_jours',     '30')
on conflict (key) do nothing;

alter table public.aria_settings enable row level security;

create policy "Service role full access on settings"
  on public.aria_settings for all to service_role using (true);

create policy "Authenticated users can read settings"
  on public.aria_settings for select to authenticated using (true);
