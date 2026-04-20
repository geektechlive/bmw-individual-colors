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
  location_country  text default 'USA',
  location_lat      double precision,
  location_lng      double precision,

  -- Provenance
  forum_username    text,
  source_forum      text default 'BimmerPost',
  posted_at         timestamptz,
  user_submitted    boolean not null default false,

  -- Moderation
  flag_count        integer default 0,
  notes             text
);

-- ── RPC: increment_flag ────────────────────────────────────────────────────────

create or replace function increment_flag(entry_id uuid)
returns void
language sql
security definer
as $$
  update bmwic_entries set flag_count = flag_count + 1 where id = entry_id;
$$;

-- ── Row Level Security ─────────────────────────────────────────────────────────

alter table bmwic_entries enable row level security;

create policy "public read" on bmwic_entries
  for select using (true);

create policy "public insert" on bmwic_entries
  for insert with check (true);
