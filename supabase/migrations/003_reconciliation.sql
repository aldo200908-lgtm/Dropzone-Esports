-- Run AFTER 001_init.sql and 002_leaderboard_periods.sql
-- Close expired tournaments only after the deadline. Tournament writes are atomic.
create function public.reconcile_expired_tournaments() returns int
language plpgsql security definer set search_path='' as $$
declare t public.tournaments%rowtype; n int; changed int:=0;
begin
 if auth.role() is distinct from 'service_role' and not public.is_admin() and session_user <> 'postgres' then
 raise exception 'No tienes permisos para conciliar torneos';
 end if;
 for t in select * from public.tournaments
 where registration_deadline <= now() and status in ('open','confirmed','full')
 order by registration_deadline for update
 loop
  select count(*) into n from public.registrations r where r.tournament_id=t.id and r.status='confirmed';
  if n<t.min_players then
   update public.tournaments set status='cancelled' where id=t.id;
   changed:=changed+1;
  elsif n>=t.max_players and t.status<>'full' then
   update public.tournaments set status='full' where id=t.id;
   changed:=changed+1;
  elsif n>=t.min_players and t.status='open' then
   update public.tournaments set status='confirmed' where id=t.id;
   changed:=changed+1;
  end if;
 end loop;
 return changed;
end;$$;
revoke all on function public.reconcile_expired_tournaments() from public;
grant execute on function public.reconcile_expired_tournaments() to authenticated,service_role;
