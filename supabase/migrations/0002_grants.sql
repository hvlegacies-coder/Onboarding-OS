-- Grants for the tables added in 0001.
--
-- Supabase's default privileges did not reach tables created inside the SQL
-- editor session, so prospects / prospect_events / sessions ended up with no
-- privileges for any role. The public flows still worked because those RPCs are
-- SECURITY DEFINER and run as the function owner — but the app itself, signing
-- in as `authenticated`, could not read its own data.
--
-- Privileges say WHO may touch a table at all; the RLS policies from 0001 say
-- WHICH ROWS. Both are required.

grant select, insert, update, delete on public.prospects       to authenticated, service_role;
grant select, insert, update, delete on public.prospect_events to authenticated, service_role;
grant select, insert, update, delete on public.sessions        to authenticated, service_role;

-- `anon` is deliberately absent. A signed-out visitor reaches exactly two
-- things — the session list and their own contract — and both go through the
-- SECURITY DEFINER functions, which return one row for the slug or token they
-- already hold. Granting table access here would widen that to the whole table
-- and leave only RLS between a stranger and every tenant's pipeline.

-- Remove the probe row left behind while verifying register_prospect().
delete from public.prospects where email = 'probe@example.com';
