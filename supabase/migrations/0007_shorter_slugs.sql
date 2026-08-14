-- Shorten invite links for offices created from now on.
--
-- owners_fill_identity() (0003) slugs a new office from its full company
-- name, so "Syndex Tax LLC" becomes /join/syndex-tax-llc. That's fine as a
-- link, but owners read these out loud and type them from memory — shorter
-- is better. This caps the base to the first name word (max 10 chars) before
-- the existing de-duplication loop runs.
--
-- Offices that already have a slug are untouched: this only reaches rows via
-- the same "slug is null" trigger path as 0003, so existing invite links
-- already handed out keep working.

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
    -- Just the first word, capped, so the link stays short and speakable.
    base := left(split_part(base, '-', 1), 10);
    if base = '' then base := 'office'; end if;

    -- Two owners may share a name (or its first word), so walk until free.
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
