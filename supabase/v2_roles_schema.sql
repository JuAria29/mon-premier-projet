-- ============================================================
-- Aria Coach V2 — Système de rôles et permissions
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Table des rôles
create table if not exists roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  color       text default '#b5612f',   -- couleur d'affichage dans l'UI
  is_system   boolean default false,    -- rôles système non supprimables
  created_at  timestamptz default now()
);

-- 2. Table des modules disponibles
create table if not exists modules (
  id    text primary key,  -- 'finances', 'commercial', 'planning', etc.
  label text not null,
  icon  text              -- nom d'icône pour l'UI
);

-- 3. Table des permissions (rôle × module → niveau)
create table if not exists role_permissions (
  id        uuid primary key default gen_random_uuid(),
  role_id   uuid not null references roles(id) on delete cascade,
  module_id text not null references modules(id) on delete cascade,
  level     text not null check (level in ('full', 'write', 'read', 'own', 'none')),
  unique(role_id, module_id)
);

-- 4. Profils utilisateurs (étend Supabase Auth)
create table if not exists user_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      text,
  role_id    uuid references roles(id) on delete set null,
  company_id uuid,          -- réservé pour le multi-tenant futur
  invited_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Index utiles
create index if not exists idx_role_permissions_role_id on role_permissions(role_id);
create index if not exists idx_user_profiles_role_id   on user_profiles(role_id);

-- 6. RLS — activer sur toutes les tables
alter table roles             enable row level security;
alter table modules           enable row level security;
alter table role_permissions  enable row level security;
alter table user_profiles     enable row level security;

-- Policies : lecture publique pour les utilisateurs authentifiés
create policy "Authenticated users can read roles"
  on roles for select to authenticated using (true);

create policy "Authenticated users can read modules"
  on modules for select to authenticated using (true);

create policy "Authenticated users can read role_permissions"
  on role_permissions for select to authenticated using (true);

-- Policies : chaque utilisateur peut lire son propre profil
create policy "Users can read own profile"
  on user_profiles for select to authenticated
  using (auth.uid() = id);

-- Policies : seul le dirigeant (role slug = 'dirigeant') peut modifier les rôles
create policy "Dirigeant can manage roles"
  on roles for all to authenticated
  using (
    exists (
      select 1 from user_profiles up
      join roles r on r.id = up.role_id
      where up.id = auth.uid() and r.slug = 'dirigeant'
    )
  );

create policy "Dirigeant can manage role_permissions"
  on role_permissions for all to authenticated
  using (
    exists (
      select 1 from user_profiles up
      join roles r on r.id = up.role_id
      where up.id = auth.uid() and r.slug = 'dirigeant'
    )
  );

create policy "Dirigeant can manage user_profiles"
  on user_profiles for all to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1 from user_profiles up
      join roles r on r.id = up.role_id
      where up.id = auth.uid() and r.slug = 'dirigeant'
    )
  );
