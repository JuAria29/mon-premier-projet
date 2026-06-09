-- Schema NextAuth.js pour @auth/supabase-adapter
-- À exécuter dans l'éditeur SQL de Supabase (projet > SQL Editor)

create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid not null default uuid_generate_v4(),
  name text,
  email text unique,
  "emailVerified" timestamptz,
  image text,
  primary key (id)
);

create table if not exists accounts (
  id uuid not null default uuid_generate_v4(),
  "userId" uuid not null references users(id) on delete cascade,
  type text not null,
  provider text not null,
  "providerAccountId" text not null,
  refresh_token text,
  access_token text,
  expires_at int8,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  primary key (id),
  unique (provider, "providerAccountId")
);

create table if not exists sessions (
  id uuid not null default uuid_generate_v4(),
  "sessionToken" text not null unique,
  "userId" uuid not null references users(id) on delete cascade,
  expires timestamptz not null,
  primary key (id)
);

create table if not exists verification_tokens (
  identifier text not null,
  token text not null unique,
  expires timestamptz not null,
  primary key (identifier, token)
);
