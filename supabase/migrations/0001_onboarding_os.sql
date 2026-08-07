-- Higher View Onboarding OS — additive migration
--
-- This project already runs an earlier version of the contract tool, holding
-- real data: 31 owners, 9 signed documents, 2 admins. NOTHING here drops or
-- rewrites those tables. We extend what exists and add only what is genuinely
-- new (the pipeline, the calendar, reminders).
--
-- Mapping to the existing schema:
--   owners           -> the offices/tenants. Extended with slug, initials, branding.
--   owner_contracts  -> each office's customisation. Left as-is.
--   documents        -> contracts sent for signature. Extended with reminders.
--   user_roles       -> already carries admin/owner. Extended with office binding.
--
-- Safe to re-run: every statement is IF NOT EXISTS / OR REPLACE.

create extension if not exists "pgcrypto";

-- ── 1. Extend owners into full tenants ────────────────────
-- The app addresses offices by a URL slug; the old build used invite_token.
-- Both can coexist: the token keeps old links working, the slug powers /join/:slug.
alter table owners add column if not exists slug        text;
alter table owners add column if not exists initials    text;
alter table owners add column if not exists branding    text not null default 'contract-pending';
alter table owners add column if not exists owner_name  text not null default '';

-- Backfill a slug for every existing owner so none are left unreachable.
update owners
   set slug = regexp_replace(lower(coalesce(nullif(company_name,''), name, id::text)), '[^a-z0-9]+', '-', 'g')
 where slug is null;
update owners set slug = trim(both '-' from slug) where slug like '-%' or slug like '%-';

-- Two owners can legitimately share a name, and at least one pair here does.
-- Suffix the later duplicates so every office keeps a distinct invite link
-- rather than failing the whole migration.
with ranked as (
  select id, slug, row_number() over (partition by slug order by created_at, id) as rn
    from owners
   where slug is not null
)
update owners o
   set slug = o.slug || '-' || r.rn
  from ranked r
 where o.id = r.id and r.rn > 1;

-- Two offices sharing a slug would send prospects to the wrong tenant (R2).
create unique index if not exists owners_slug_key on owners (slug);

update owners
   set initials = upper(left(regexp_replace(coalesce(nullif(company_name,''), name, 'X'), '[^A-Za-z]', '', 'g'), 2))
 where initials is null or initials = '';

-- ── 2. Bind a signed-in user to their office ──────────────
-- user_roles already says who is an admin. It does not say which office an
-- owner belongs to, and every tenant policy below needs that.
alter table user_roles add column if not exists owner_id uuid references owners on delete cascade;

create unique index if not exists user_roles_user_key on user_roles (user_id);

create or replace function auth_is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
$$;

-- The single office an owner may see. NULL for admins (who see everything).
create or replace function auth_owner_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select owner_id from user_roles where user_id = auth.uid() limit 1
$$;

-- ── 3. The calendar (new) ─────────────────────────────────
create table if not exists sessions (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null default 'Discovery Session'
             check (kind in ('Discovery Session','New Preparer Orientation')),
  date_on    date not null,
  time_label text not null,
  note       text not null default '',
  created_at timestamptz not null default now()
);

-- ── 4. The pipeline (new) ─────────────────────────────────
do $$ begin
  create type onboarding_stage as enum (
    'invited','scheduled','attended','sent','reminder1','reminder2',
    'signed','followup','orientation','onboarded'
  );
exception when duplicate_object then null; end $$;

create table if not exists prospects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references owners on delete restrict,
  name        text not null,
  email       text not null,
  phone       text not null default '',
  stage       onboarding_stage not null default 'scheduled',
  session_id  uuid references sessions on delete set null,
  referred_by text not null default '',
  invited_on  date not null default current_date,
  signed_on   date,
  -- Links a prospect to the document raised for them, when there is one.
  document_id uuid references documents on delete set null,
  created_at  timestamptz not null default now()
);

create unique index if not exists prospects_office_email_key
  on prospects (owner_id, lower(email));
create index if not exists prospects_owner_idx on prospects (owner_id);
create index if not exists prospects_stage_idx on prospects (stage);

create table if not exists prospect_events (
  id          uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects on delete cascade,
  actor       text not null default 'automation',
  body        text not null,
  stage       onboarding_stage,
  created_at  timestamptz not null default now()
);
create index if not exists prospect_events_idx on prospect_events (prospect_id, created_at desc);

-- ── 5. Reminders on existing documents ────────────────────
-- The 12/24/48 schedule needs somewhere to record what has already gone out,
-- so a reminder is never sent twice. Existing rows default to "nothing sent".
alter table documents add column if not exists reminders         text[] not null default '{}';
alter table documents add column if not exists reminders_stopped boolean not null default false;
alter table documents add column if not exists sent_at           timestamptz;

update documents set sent_at = coalesce(sent_at, created_at) where sent_at is null;

-- The 9 already-signed documents must never be chased by the new automation.
update documents set reminders_stopped = true where status = 'signed';

-- ── 6. Row Level Security ─────────────────────────────────
alter table owners          enable row level security;
alter table owner_contracts enable row level security;
alter table documents       enable row level security;
alter table user_roles      enable row level security;
alter table sessions        enable row level security;
alter table prospects       enable row level security;
alter table prospect_events enable row level security;

-- Dropped first so this migration can be re-run safely.
drop policy if exists owners_read      on owners;
drop policy if exists owners_write     on owners;
drop policy if exists prospects_rw     on prospects;
drop policy if exists events_rw        on prospect_events;
drop policy if exists documents_rw     on documents;
drop policy if exists contracts_rw     on owner_contracts;
drop policy if exists sessions_read    on sessions;
drop policy if exists sessions_write   on sessions;
drop policy if exists roles_read       on user_roles;

create policy owners_read on owners for select to authenticated
  using (auth_is_admin() or id = auth_owner_id());
create policy owners_write on owners for all to authenticated
  using (auth_is_admin()) with check (auth_is_admin());

-- The tenant boundary. An owner cannot read another office's prospects even by
-- asking for them directly — this is what makes the scoping binding rather than
-- a client-side convention.
create policy prospects_rw on prospects for all to authenticated
  using (auth_is_admin() or owner_id = auth_owner_id())
  with check (auth_is_admin() or owner_id = auth_owner_id());

create policy events_rw on prospect_events for all to authenticated
  using (exists (select 1 from prospects p where p.id = prospect_id
                   and (auth_is_admin() or p.owner_id = auth_owner_id())))
  with check (exists (select 1 from prospects p where p.id = prospect_id
                   and (auth_is_admin() or p.owner_id = auth_owner_id())));

create policy documents_rw on documents for all to authenticated
  using (auth_is_admin() or owner_id = auth_owner_id())
  with check (auth_is_admin() or owner_id = auth_owner_id());

create policy contracts_rw on owner_contracts for all to authenticated
  using (auth_is_admin() or owner_id = auth_owner_id())
  with check (auth_is_admin() or owner_id = auth_owner_id());

-- One shared calendar: everyone signed in reads it, only admins change it.
create policy sessions_read  on sessions for select to authenticated using (true);
create policy sessions_write on sessions for all    to authenticated
  using (auth_is_admin()) with check (auth_is_admin());

create policy roles_read on user_roles for select to authenticated
  using (user_id = auth.uid() or auth_is_admin());

-- ── 7. Public capabilities ────────────────────────────────
-- Not policies. A slug or token is a capability: RLS cannot express "only the
-- row whose token you already hold" without opening the table to everyone, so
-- anonymous access goes through these functions and returns exactly one row.

create or replace function public_sessions()
  returns table (id uuid, kind text, date_on date, time_label text)
  language sql stable security definer set search_path = public as $$
  select id, kind, date_on, time_label
    from sessions
   where kind = 'Discovery Session' and date_on >= current_date
   order by date_on
$$;

-- Booking a seat. The office is resolved from the slug HERE, server-side — the
-- caller cannot choose it. Domain rule R2 becomes a database guarantee.
create or replace function register_prospect(
  p_slug text, p_name text, p_email text, p_phone text, p_session uuid
) returns uuid
  language plpgsql volatile security definer set search_path = public as $$
declare v_owner uuid; v_id uuid;
begin
  select id into v_owner from owners where slug = lower(p_slug);
  if v_owner is null then raise exception 'unknown invite link'; end if;

  insert into prospects (owner_id, name, email, phone, stage, session_id, referred_by)
  values (v_owner, p_name, p_email, p_phone, 'scheduled', p_session,
          (select coalesce(nullif(owner_name,''), nullif(company_name,''), name) from owners where id = v_owner))
  on conflict (owner_id, lower(email))
    do update set name = excluded.name, phone = excluded.phone, session_id = excluded.session_id
  returning id into v_id;

  return v_id;
end $$;

-- Opening a signing link marks it viewed, exactly as the app does today.
create or replace function get_document(p_token uuid)
  returns setof documents
  language sql volatile security definer set search_path = public as $$
  update documents
     set first_accessed_at = coalesce(first_accessed_at, now()),
         status = case when status = 'pending' then 'viewed' else status end
   where token = p_token
  returning *
$$;

create or replace function sign_document(p_token uuid, p_signature text, p_form jsonb)
  returns setof documents
  language sql volatile security definer set search_path = public as $$
  update documents
     set status = 'signed', signature = p_signature,
         form_data = coalesce(p_form, form_data), signed_at = now(),
         reminders_stopped = true
   where token = p_token and status <> 'signed'
  returning *
$$;

grant execute on function public_sessions()                            to anon, authenticated;
grant execute on function register_prospect(text,text,text,text,uuid)  to anon, authenticated;
grant execute on function get_document(uuid)                           to anon, authenticated;
grant execute on function sign_document(uuid,text,jsonb)               to anon, authenticated;
