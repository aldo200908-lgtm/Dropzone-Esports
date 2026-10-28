-- Run AFTER 001_init.sql
create function public.public_leaderboard_range(range_name text default 'all',max_rows int default 50)
returns table(nickname text,points bigint,wins bigint,kills bigint,played bigint)
language sql stable security definer set search_path='' as $$
 select p.nickname,coalesce(sum(r.points),0)::bigint,count(*) filter(where r.placement=1)::bigint,
 coalesce(sum(r.kills),0)::bigint,count(*)::bigint
 from public.results r join public.profiles p on p.id=r.user_id
 join public.tournaments t on t.id=r.tournament_id
 where p.is_public and t.status='finished'
 and (range_name='all' or (range_name='week' and t.starts_at>=now()-interval '7 days')
 or (range_name='month' and t.starts_at>=now()-interval '30 days'))
 group by p.id,p.nickname order by 2 desc,3 desc,4 desc limit least(greatest(max_rows,1),100);
$$;
revoke all on function public.public_leaderboard_range(text,int) from public;
grant execute on function public.public_leaderboard_range(text,int) to anon,authenticated;
