-- ============================================================
-- Aria Coach V2 — Trigger création user_profile à l'invitation
-- À exécuter dans Supabase SQL Editor (après v2_roles_schema.sql)
-- ============================================================

-- Fonction appelée à chaque nouvel utilisateur auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name, email, role_id)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    case
      when new.raw_user_meta_data->>'role_id' is not null
      then (new.raw_user_meta_data->>'role_id')::uuid
      else null
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger sur auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
