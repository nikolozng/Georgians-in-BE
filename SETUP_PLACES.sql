-- ═══════════════════════════════════════════════════════════════════
-- SETUP_PLACES.sql — Georgian places (restaurants, shops, churches…)
-- Run ONCE in Supabase: Dashboard → SQL Editor → paste → Run.
-- Safe to re-run.
-- NOTE: places are NOT auto-approved (no trigger) — every submission
-- waits in the admin review queue, unlike jobs/housing.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists places (
  id bigserial primary key,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  name_ka text,
  type text not null,          -- restaurant | shop | bakery | church | community | other
  city text not null,
  address text,
  description text not null,
  description_ka text,
  website text,
  phone text,
  map_url text,                -- Google Maps link from the submitter
  image_url text,
  lat double precision,        -- optional; admin can fill in later for the map view
  lng double precision,
  approved boolean default false not null
);

create index if not exists places_type_idx on places(type, city);

alter table places enable row level security;

drop policy if exists "View approved places or own" on places;
create policy "View approved places or own" on places
  for select to anon, authenticated
  using (approved = true or auth.uid() = user_id);

drop policy if exists "Logged-in users submit places" on places;
create policy "Logged-in users submit places" on places
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own places" on places;
create policy "Users delete own places" on places
  for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins manage places" on places;
create policy "Admins manage places" on places
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
