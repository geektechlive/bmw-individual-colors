-- BMW Individual Colors Registry — Supabase schema
-- Run this in the Supabase SQL editor (https://supabase.com/dashboard/project/_/sql)
-- to create the database from scratch.

-- ── Table ─────────────────────────────────────────────────────────────────────

create table if not exists bmwic_entries (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz default now(),

  -- Build details
  model_year        smallint not null,
  body_style        text not null,
  competition       boolean default true,
  drivetrain        text not null,
  transmission      text not null,

  -- Colors
  ext_color         text not null,
  interior_color    text,
  interior_type     text,
  interior_seats    text,
  interior_leather  text,

  -- Options
  wheels            text,

  -- Location
  location_city     text,
  location_state    text,
  location_country  text default 'United States',
  location_lat      double precision,
  location_lng      double precision,

  -- Provenance
  forum_username    text,
  source_forum      text default 'BimmerPost',
  posted_at         timestamptz,
  user_submitted    boolean not null default false,

  -- Moderation
  flag_count        integer default 0,
  notes             text,

  -- Editing / soft delete
  edit_count        integer not null default 0,
  last_edited_at    timestamptz,
  deleted_at        timestamptz
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- Enforces one entry per (user, build spec) for web-submitted entries only —
-- forum-imported rows (user_submitted = false) are exempt since scrape data
-- can legitimately contain repeats we haven't deduped yet.
create unique index if not exists bmwic_entries_user_submitted_unique
  on bmwic_entries (forum_username, ext_color, model_year, body_style, drivetrain)
  where user_submitted = true;

-- Partial index to make the admin "Recently deleted" query and cleanup jobs cheap.
create index if not exists bmwic_entries_deleted_at_idx
  on bmwic_entries (deleted_at)
  where deleted_at is not null;

-- ── Flags ─────────────────────────────────────────────────────────────────────
-- The old increment_flag RPC (count-only flags) was dropped 2026-11-13 (#33):
-- it was executable by anon via the default PUBLIC grant. Flags now carry a
-- reason and live in public.bmwic_flags (end of this file, #31).
-- bmwic_entries.flag_count is legacy (all 0) and no longer written by the site.
-- Every new SECURITY DEFINER function must `revoke all ... from public, anon,
-- authenticated` explicitly: revoking only anon/authenticated leaves PUBLIC.

-- ── Row Level Security ─────────────────────────────────────────────────────────

alter table bmwic_entries enable row level security;

-- Only non-deleted rows are visible to anon/authenticated readers. Soft-deleted rows
-- remain queryable by the service-role client (which bypasses RLS) for the admin
-- "Recently deleted / Restore" flow.
create policy "public read" on bmwic_entries
  for select using (deleted_at is null);

-- No public insert policy: the anon key is public, so an open insert policy is a spam
-- vector. All inserts go through Server Actions using the service-role client
-- (see src/app/actions.ts), which bypasses RLS entirely. Removed 2026-04-19.

-- ---------------------------------------------------------------------------
-- Edge-cache invalidation (worker.ts / src/lib/edge-cache.ts).
-- Any write to bmwic_entries — site actions, scripts, or the Supabase
-- dashboard — increments data_version; the Worker keys its page cache on it.
-- Statement-level, so a zero-row content UPDATE also bumps (one re-render).
-- Updates that touch only flag_count (legacy; bmwic_moderate's dismiss) do NOT
-- bump (#26): flag_count is moderation-only and never rendered publicly, and
-- each bump re-renders every page in every data center. Flags themselves live
-- in bmwic_flags, so they never touch this trigger at all.
-- When adding a column that public pages render, add it to the UPDATE OF list.
-- ---------------------------------------------------------------------------
create table if not exists public.bmwic_meta (
  id int primary key check (id = 1),
  data_version bigint not null default 1
);
insert into public.bmwic_meta (id, data_version) values (1, 1) on conflict (id) do nothing;

alter table public.bmwic_meta enable row level security;
revoke all on public.bmwic_meta from anon, authenticated;
grant select on public.bmwic_meta to anon, authenticated;
create policy "public read" on public.bmwic_meta for select to anon, authenticated using (true);

create or replace function public.bmwic_bump_data_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Row lock on the singleton serializes concurrent writers: every committed
  -- change gets its own version, unlike now() which is shared per transaction.
  update public.bmwic_meta set data_version = data_version + 1 where id = 1;
  return null;
end;
$$;
revoke all on function public.bmwic_bump_data_version() from public, anon, authenticated;

drop trigger if exists bmwic_entries_bump_data_version on public.bmwic_entries;
create trigger bmwic_entries_bump_data_version
  after insert or delete or truncate on public.bmwic_entries
  for each statement execute function public.bmwic_bump_data_version();

-- Every column except flag_count (#26).
drop trigger if exists bmwic_entries_bump_data_version_on_update on public.bmwic_entries;
create trigger bmwic_entries_bump_data_version_on_update
  after update of id, created_at, model_year, body_style, competition, drivetrain, transmission,
    ext_color, interior_color, interior_type, wheels, location_city, location_state,
    location_country, location_lat, location_lng, forum_username, notes, source_forum,
    posted_at, user_submitted, interior_seats, interior_leather, edit_count,
    last_edited_at, deleted_at
  on public.bmwic_entries
  for each statement execute function public.bmwic_bump_data_version();

-- ---------------------------------------------------------------------------
-- Flag reasons (#31). Each flag records WHY an entry looks wrong so the owner
-- can act on it at /admin. Flags live outside bmwic_entries, so flagging never
-- bumps bmwic_meta.data_version or touches the public edge cache (#26).
-- Only the site's service-role client reaches this table and these functions.
-- Applied live 2026-11-13; mirrored at the end of schema.sql.
-- ---------------------------------------------------------------------------
create table if not exists public.bmwic_flags (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.bmwic_entries(id) on delete cascade,
  reason text not null
    check (reason in ('wrong_color', 'wrong_details', 'duplicate', 'not_real', 'other')),
  note text check (note is null or char_length(note) <= 280),
  -- HMAC of the reporter's IP (never the raw IP): one open flag per reporter per entry.
  reporter_hash text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint bmwic_flags_other_needs_note
    check (reason <> 'other' or nullif(btrim(note), '') is not null)
);

create unique index if not exists bmwic_flags_one_open_per_reporter
  on public.bmwic_flags (entry_id, reporter_hash) where resolved_at is null;
create index if not exists bmwic_flags_open_by_entry
  on public.bmwic_flags (entry_id, created_at) where resolved_at is null;

alter table public.bmwic_flags enable row level security;
revoke all on public.bmwic_flags from public, anon, authenticated;
grant select, insert, update on public.bmwic_flags to service_role;

-- Adds a flag atomically. The entry row is share-locked, so a concurrent
-- soft-delete either happens first (-> not_found) or waits for this insert.
-- Returns: ok | not_found | duplicate | too_many
create or replace function public.bmwic_flag_entry(
  p_entry_id uuid, p_reason text, p_note text, p_reporter_hash text
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_open int;
begin
  perform 1 from public.bmwic_entries
    where id = p_entry_id and deleted_at is null
    for share;
  if not found then
    return 'not_found';
  end if;

  select count(*) into v_open
    from public.bmwic_flags
    where entry_id = p_entry_id and resolved_at is null;
  if v_open >= 20 then
    return 'too_many';
  end if;

  insert into public.bmwic_flags (entry_id, reason, note, reporter_hash)
    values (p_entry_id, p_reason, nullif(btrim(p_note), ''), p_reporter_hash);
  return 'ok';
exception
  when unique_violation then
    return 'duplicate';
end;
$$;

-- Admin moderation in one transaction. Returns: ok | not_found | bad_op
--   dismiss: resolve the entry's open flags (and clear the legacy count; flag-only, no cache bump)
--   delete:  soft-delete the entry and resolve its open flags together
--   restore: clear deleted_at (flags resolved at delete time stay resolved)
create or replace function public.bmwic_moderate(p_entry_id uuid, p_op text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_op = 'dismiss' then
    update public.bmwic_flags set resolved_at = now()
      where entry_id = p_entry_id and resolved_at is null;
    update public.bmwic_entries set flag_count = 0
      where id = p_entry_id and flag_count <> 0;
    return 'ok';
  elsif p_op = 'delete' then
    update public.bmwic_entries set deleted_at = now()
      where id = p_entry_id and deleted_at is null;
    if not found then
      return 'not_found';
    end if;
    update public.bmwic_flags set resolved_at = now()
      where entry_id = p_entry_id and resolved_at is null;
    return 'ok';
  elsif p_op = 'restore' then
    update public.bmwic_entries set deleted_at = null
      where id = p_entry_id and deleted_at is not null;
    if not found then
      return 'not_found';
    end if;
    return 'ok';
  end if;
  return 'bad_op';
end;
$$;

revoke all on function public.bmwic_flag_entry(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.bmwic_moderate(uuid, text) from public, anon, authenticated;
grant execute on function public.bmwic_flag_entry(uuid, text, text, text) to service_role;
grant execute on function public.bmwic_moderate(uuid, text) to service_role;
