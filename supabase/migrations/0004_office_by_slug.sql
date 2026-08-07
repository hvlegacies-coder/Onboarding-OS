-- Resolve an office from its invite link, for a signed-out prospect.
--
-- RLS blocks anonymous reads of `owners`, which is correct — that table holds
-- emails, phone numbers and link passwords for 32 tenants. But /join/:slug has
-- to know the link is real before showing a form.
--
-- So this returns a deliberately narrow row: enough to confirm the office
-- exists and to name the owner in a fallback message, and nothing more. No
-- email, no phone, no link_password, no logo.
--
-- The invitation form itself shows no office branding at all (R1) — the office
-- is carried by the link, not displayed — so the app needs very little here.

create or replace function office_by_slug(p_slug text)
  returns table (
    id           uuid,
    name         text,
    company_name text,
    slug         text,
    owner_name   text,
    initials     text
  )
  language sql stable security definer set search_path = public as $$
  select o.id,
         o.name,
         o.company_name,
         o.slug,
         coalesce(nullif(o.owner_name, ''), o.name) as owner_name,
         o.initials
    from owners o
   where o.slug = lower(p_slug)
   limit 1
$$;

grant execute on function office_by_slug(text) to anon, authenticated;
