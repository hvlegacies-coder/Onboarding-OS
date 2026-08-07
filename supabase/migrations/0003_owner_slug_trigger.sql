-- Keep every office reachable by invite link.
--
-- 0001 backfilled slugs for the owners that existed when it ran. That is a
-- one-off: an owner created afterwards gets slug = NULL, has no working
-- /join/:slug link, and the unique index stays quiet because it permits many
-- NULLs. One such row already appeared minutes after the migration.
--
-- A trigger closes it at the source, so it holds no matter what creates the
-- row — this app, the older build, the dashboard, or a future import.

create or replace function owners_fill_identity() returns trigger
  language plpgsql set search_path = public as $$
declare
  base      text;
  candidate text;
  n         int := 1;
begin
  if new.slug is null or new.slug = '' then
    base := trim(both '-' from regexp_replace(
      lower(coalesce(nullif(new.company_name, ''), nullif(new.name, ''), new.id::text)),
      '[^a-z0-9]+', '-', 'g'));
    if base = '' then base := 'office'; end if;

    -- Two owners may share a name, so walk until the slug is free.
    candidate := base;
    while exists (select 1 from owners where slug = candidate and id is distinct from new.id) loop
      n := n + 1;
      candidate := base || '-' || n;
    end loop;
    new.slug := candidate;
  end if;

  if new.initials is null or new.initials = '' then
    new.initials := upper(left(regexp_replace(
      coalesce(nullif(new.company_name, ''), nullif(new.name, ''), 'X'), '[^A-Za-z]', '', 'g'), 2));
    if new.initials = '' then new.initials := 'HV'; end if;
  end if;

  return new;
end $$;

drop trigger if exists owners_fill_identity_trg on owners;
create trigger owners_fill_identity_trg
  before insert or update on owners
  for each row execute function owners_fill_identity();

-- Catch up anything created between 0001 and this trigger.
update owners set slug = null where slug = '';
update owners set id = id where slug is null or initials is null or initials = '';
