-- DROPZONE ESPORTS GitHub Pages: permissions for authenticated profiles.
-- Run AFTER 001_init.sql, 002_leaderboard_periods.sql and 003_reconciliation.sql.
-- The profiles table already has RLS and ownership policies from migration 001.
-- The browser must never use a service_role or secret key.
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant update (nickname, game_uid, is_public) on public.profiles to authenticated;

-- Authentication trigger creates profiles without accepting user-selected roles.
-- Profile role changes must take place via protected administrator operations only.
-- No grant to anon is required: public profiles are not exposed here.
