-- DROPZONE ESPORTS · 005 UID lookup
-- Ejecutar después de 004_static_auth.sql
-- Solo muestra nicks de usuarios que hayan activado la visibilidad pública.
-- Un nickname de DROPZONE no equivale a una verificación del juego.
create or replace function public.lookup_dropzone_uid(player_uid text)
returns table (nickname text, uid text)
language plpgsql stable security definer set search_path = ''
as $$
begin
 if (select auth.uid()) is null then
  raise exception 'Debes iniciar sesión';
 end if;
 if player_uid is null or player_uid !~ '^[0-9]{5,15}$' then
  return;
 end if;
 return query
 select p.nickname, p.game_uid
 from public.profiles p
 where p.game_uid = player_uid and p.is_public = true
 limit 1;
end;
$$;
revoke all on function public.lookup_dropzone_uid(text) from public;
grant execute on function public.lookup_dropzone_uid(text) to authenticated;

-- Limita las consultas externas costosas por usuario.
create table if not exists public.freefire_lookup_rate (
 user_id uuid primary key references auth.users(id) on delete cascade,
 period_start timestamptz not null default now(),
 uses integer not null default 0 check (uses between 0 and 10)
);
alter table public.freefire_lookup_rate enable row level security;
-- Sin políticas: acceso solamente mediante la función segura.
revoke all on table public.freefire_lookup_rate from anon, authenticated;

create or replace function public.claim_freefire_lookup()
returns boolean
language plpgsql volatile security definer set search_path = ''
as $$
declare v_id uuid;
declare v_used integer;
begin
 v_id := (select auth.uid());
 if v_id is null then return false; end if;
 insert into public.freefire_lookup_rate(user_id,period_start,uses)
 values(v_id,now(),1)
 on conflict (user_id) do update
 set period_start = case when public.freefire_lookup_rate.period_start < now() - interval '1 hour' then now() else public.freefire_lookup_rate.period_start end,
 uses = case when public.freefire_lookup_rate.period_start < now() - interval '1 hour' then 1 else public.freefire_lookup_rate.uses + 1 end
 where public.freefire_lookup_rate.period_start < now() - interval '1 hour'
 or public.freefire_lookup_rate.uses < 10
 returning uses into v_used;
 return v_used is not null;
end;
$$;
revoke all on function public.claim_freefire_lookup() from public;
grant execute on function public.claim_freefire_lookup() to authenticated;

-- Resultados externos cacheados por 24h para reducir consultas de pago.
create table if not exists public.freefire_lookup_cache (
 uid text primary key check(uid ~ '^[0-9]{5,15}$'),
 nickname text not null,
 region text,
 level integer,
 fetched_at timestamptz not null default now()
);
alter table public.freefire_lookup_cache enable row level security;
revoke all on table public.freefire_lookup_cache from anon, authenticated;
