-- DROPZONE ESPORTS · Supabase migration 001
-- Execute once from Supabase SQL Editor. No payment processing is enabled.
create extension if not exists pgcrypto;

create type public.user_role as enum ('player','moderator','admin');
create type public.tournament_state as enum ('draft','open','confirmed','full','in_progress','finished','cancelled');
create type public.registration_state as enum ('reserved','confirmed','cancelled','waitlisted');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 nickname text not null check (nickname ~ '^[A-Za-z0-9_-]{3,24}$'),
 game_uid text check (game_uid is null or game_uid ~ '^[0-9]{1,30}$'),
 role public.user_role not null default 'player',
 is_public boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index profiles_nickname_lower_idx on public.profiles(lower(nickname));
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create function public.on_auth_user_created() returns trigger language plpgsql security definer set search_path='' as $$
declare nick text;
begin
 nick := coalesce(nullif(new.raw_user_meta_data->>'nickname',''),'Player_'||substr(replace(new.id::text,'-',''),1,8));
 if nick !~ '^[A-Za-z0-9_-]{3,24}$' then nick:='Player_'||substr(replace(new.id::text,'-',''),1,8); end if;
 insert into public.profiles(id,nickname) values(new.id,nick);
 return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.on_auth_user_created();

create function public.protect_role_change() returns trigger language plpgsql set search_path='' as $$
begin
 if (select auth.uid()) is not null and new.role is distinct from old.role and not public.is_admin() then
 raise exception 'No puedes modificar tu rol';
 end if;
 new.updated_at=now();
 return new;
end; $$;
create trigger protect_profiles before update on public.profiles for each row execute function public.protect_role_change();

create table public.games (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique,
 name text not null,
 enabled boolean not null default true
);
insert into public.games(slug,name) values ('free-fire','Free Fire');

create table public.seasons (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 active boolean not null default false,
 check (ends_at>starts_at)
);

create table public.tournaments (
 id uuid primary key default gen_random_uuid(),
 game_id uuid not null references public.games(id),
 season_id uuid references public.seasons(id),
 created_by uuid references public.profiles(id),
 title text not null check(length(title) between 5 and 90),
 slug text not null unique,
 description text,
 starts_at timestamptz not null,
 registration_deadline timestamptz not null,
 min_players int not null default 35 check(min_players>=2),
 max_players int not null default 50 check(max_players>=min_players and max_players<=100),
 prize_cents bigint not null default 0 check(prize_cents>=0),
 entry_cents bigint not null default 0 check(entry_cents>=0),
 status public.tournament_state not null default 'draft',
 modality text not null default 'Battle Royale · Individual',
 rules text,
 created_at timestamptz not null default now(),
 check(registration_deadline<starts_at)
);
create index tournaments_start_idx on public.tournaments(starts_at);
create index tournaments_status_idx on public.tournaments(status);

create table public.registrations (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.tournaments(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 status public.registration_state not null default 'confirmed',
 expires_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tournament_id,user_id)
);
create index registrations_tournament_idx on public.registrations(tournament_id,status);

create table public.rooms (
 tournament_id uuid primary key references public.tournaments(id) on delete cascade,
 room_id text not null,
 room_secret text not null,
 access_opens_at timestamptz not null,
 updated_at timestamptz not null default now()
);

create table public.results (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.tournaments(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 placement int not null check(placement between 1 and 100),
 kills int not null default 0 check(kills between 0 and 99),
 points int not null default 0 check(points>=0),
 verified_by uuid not null references public.profiles(id),
 verified_at timestamptz not null default now(),
 unique(tournament_id,user_id)
);
create index results_user_idx on public.results(user_id);

create table public.notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 title text not null,
 message text not null,
 read_at timestamptz,
 created_at timestamptz not null default now()
);

create table public.disputes (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.tournaments(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 reason text not null check(length(reason) between 10 and 2000),
 status text not null default 'pending' check(status in ('pending','reviewing','resolved','rejected')),
 resolution text,
 created_at timestamptz not null default now()
);

create table public.audit_logs (
 id bigint generated always as identity primary key,
 actor_id uuid references public.profiles(id),
 action text not null,
 entity_id uuid,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);

create table public.financial_records (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid references public.tournaments(id),
 kind text not null check(kind in ('projected_revenue','projected_cost','prize_obligation','adjustment')),
 amount_cents bigint not null,
 note text,
 created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.seasons enable row level security;
alter table public.tournaments enable row level security;
alter table public.registrations enable row level security;
alter table public.rooms enable row level security;
alter table public.results enable row level security;
alter table public.notifications enable row level security;
alter table public.disputes enable row level security;
alter table public.audit_logs enable row level security;
alter table public.financial_records enable row level security;

create policy "profiles read own or admin" on public.profiles for select to authenticated using (id=(select auth.uid()) or public.is_admin());
create policy "profiles update own or admin" on public.profiles for update to authenticated using (id=(select auth.uid()) or public.is_admin()) with check (id=(select auth.uid()) or public.is_admin());
create policy "games readable" on public.games for select to anon,authenticated using (true);
create policy "seasons readable" on public.seasons for select to anon,authenticated using (true);
create policy "seasons admin writes" on public.seasons for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "tournaments readable" on public.tournaments for select to anon,authenticated using(status<>'draft' or public.is_admin());
create policy "tournaments admin writes" on public.tournaments for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "registrations own read" on public.registrations for select to authenticated using (user_id=(select auth.uid()) or public.is_admin());
create policy "rooms restricted read" on public.rooms for select to authenticated using (
 public.is_admin() or (
 access_opens_at <= now() and
 exists(select 1 from public.registrations r where r.tournament_id=rooms.tournament_id and r.user_id=(select auth.uid()) and r.status='confirmed')
 and exists(select 1 from public.tournaments t where t.id=rooms.tournament_id and t.status in ('confirmed','full','in_progress') and now()<=t.starts_at+interval '4 hours')
 ));
create policy "rooms admin write" on public.rooms for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "results admin read" on public.results for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy "results admin writes" on public.results for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "notifications own read" on public.notifications for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy "notifications own update" on public.notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "notifications admin insert" on public.notifications for insert to authenticated with check(public.is_admin());
create policy "disputes own read" on public.disputes for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy "disputes own insert" on public.disputes for insert to authenticated with check(user_id=(select auth.uid()));
create policy "disputes admin update" on public.disputes for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "audit admin" on public.audit_logs for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "financial admin" on public.financial_records for all to authenticated using(public.is_admin()) with check(public.is_admin());

-- Public SAFE projection. NEVER include room credentials or personal UID.
create view public.tournament_cards with (security_barrier=true) as
 select t.id,t.game_id,t.title,t.slug,t.description,t.starts_at,t.registration_deadline,
 t.min_players,t.max_players,t.prize_cents,t.entry_cents,t.status,t.modality,t.rules,t.created_at,
 jsonb_build_object('name',g.name,'slug',g.slug) as game,
 (select count(*)::int from public.registrations r where r.tournament_id=t.id and (r.status='confirmed' or (r.status='reserved' and r.expires_at>now()))) as registered_count
 from public.tournaments t join public.games g on g.id=t.game_id
 where t.status<>'draft';
grant select on public.tournament_cards to anon,authenticated;

create function public.public_leaderboard(max_rows int default 20)
returns table(nickname text,points bigint,wins bigint,kills bigint,played bigint)
language sql stable security definer set search_path='' as $$
 select p.nickname,coalesce(sum(r.points),0)::bigint, count(*) filter(where r.placement=1)::bigint,
 coalesce(sum(r.kills),0)::bigint,count(*)::bigint
 from public.results r join public.profiles p on p.id=r.user_id
 join public.tournaments t on t.id=r.tournament_id
 where p.is_public and t.status='finished'
 group by p.id,p.nickname order by 2 desc,3 desc,4 desc limit least(greatest(max_rows,1),100);
$$;
revoke all on function public.public_leaderboard(int) from public;
grant execute on function public.public_leaderboard(int) to anon,authenticated;

-- Atomic free registration. Lock tournament row to avoid overbooking.
create function public.reserve_free_tournament(t_id uuid) returns text
language plpgsql security definer set search_path='' as $$
declare t public.tournaments%rowtype; n int; v_status public.registration_state;
begin
 if (select auth.uid()) is null then raise exception 'Debes iniciar sesión'; end if;
 select * into t from public.tournaments where id=t_id for update;
 if not found then raise exception 'Torneo inexistente'; end if;
 if t.entry_cents<>0 then raise exception 'Inscripciones pagadas desactivadas'; end if;
 if t.status not in ('open','confirmed','full') or now()>t.registration_deadline then raise exception 'Inscripciones cerradas'; end if;
 if not exists(select 1 from public.profiles where id=(select auth.uid()) and game_uid is not null) then raise exception 'Registra tu UID antes de participar'; end if;
 select count(*) into n from public.registrations
 where tournament_id=t_id and (status='confirmed' or (status='reserved' and expires_at>now()));
 if exists(select 1 from public.registrations where tournament_id=t_id and user_id=(select auth.uid()) and status in ('confirmed','waitlisted')) then
 raise exception 'Ya estás inscrito o en lista de espera';
 end if;
 if n>=t.max_players then v_status:='waitlisted'; else v_status:='confirmed'; end if;
 insert into public.registrations(tournament_id,user_id,status,expires_at)
 values(t_id,(select auth.uid()),v_status,null)
 on conflict(tournament_id,user_id) do update set status=excluded.status,expires_at=null,updated_at=now();
 if v_status='confirmed' then
  n:=n+1;
  if n>=t.max_players then update public.tournaments set status='full' where id=t_id;
  elsif n>=t.min_players and t.status='open' then update public.tournaments set status='confirmed' where id=t_id;
  end if;
 end if;
 return v_status::text;
end;$$;
revoke all on function public.reserve_free_tournament(uuid) from public;
grant execute on function public.reserve_free_tournament(uuid) to authenticated;

create function public.cancel_my_registration(t_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare t public.tournaments%rowtype; n int;
begin
 if (select auth.uid()) is null then raise exception 'Debes iniciar sesión';end if;
 select * into t from public.tournaments where id=t_id for update;
 if not found then raise exception 'Torneo inexistente';end if;
 if t.status in ('in_progress','finished','cancelled') or now()>t.registration_deadline then raise exception 'Ya no puedes cancelar desde la web';
 update public.registrations set status='cancelled',updated_at=now()
 where tournament_id=t_id and user_id=(select auth.uid()) and status in ('confirmed','waitlisted');
 if not found then raise exception 'No existe inscripción activa';end if;
 select count(*) into n from public.registrations where tournament_id=t_id and status='confirmed';
 if t.status='full' then
  if n<t.min_players then update public.tournaments set status='open' where id=t_id;
  else update public.tournaments set status='confirmed' where id=t_id;end if;
 elsif t.status='confirmed' and n<t.min_players then update public.tournaments set status='open' where id=t_id;
 end if;
end;$$;
revoke all on function public.cancel_my_registration(uuid) from public;
grant execute on function public.cancel_my_registration(uuid) to authenticated;

-- Admin notifications when status changes.
create function public.notify_tournament_status() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.status is distinct from new.status then
  insert into public.notifications(user_id,title,message)
  select r.user_id,'Actualización del torneo',new.title||' ahora está en estado '||new.status::text
  from public.registrations r where r.tournament_id=new.id and r.status in ('confirmed','waitlisted');
 end if;
 return new;
end;$$;
create trigger on_tournament_status after update of status on public.tournaments
for each row execute function public.notify_tournament_status();

-- Results can only be published for confirmed players. Admin writes via RLS.
create function public.validate_result_registration() returns trigger
language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.registrations r where r.tournament_id=new.tournament_id and r.user_id=new.user_id and r.status='confirmed') then
  raise exception 'El jugador no tiene inscripción confirmada en este torneo';
 end if;
 return new;
end;$$;
create trigger validate_result before insert or update on public.results
for each row execute function public.validate_result_registration();
