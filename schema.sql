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

-- ── RPC: increment_flag ────────────────────────────────────────────────────────

-- security definer so the function can update flag_count without granting anon/authenticated
-- direct UPDATE rights on the table; search_path is pinned to prevent search-path hijacking.
-- EXECUTE is revoked from anon/authenticated below — only the service-role client (used in
-- the flagEntry Server Action) calls this.
create or replace function increment_flag(entry_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update bmwic_entries set flag_count = flag_count + 1 where id = entry_id;
$$;

revoke execute on function increment_flag(uuid) from anon;
revoke execute on function increment_flag(uuid) from authenticated;

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
