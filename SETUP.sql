-- Run this once in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run)
--
-- This adds a SELECT policy so the public services listings page can read
-- approved=true rows from the `services` table. Pending submissions stay hidden.
--
-- Currently your `services` table only allows INSERT for anonymous users.
-- After running this, anonymous users can also SELECT — but ONLY rows where
-- approved=true. Pending submissions remain visible only via the dashboard.

create policy "Anyone can view approved services"
  on services for select
  to anon, authenticated
  using (approved = true);

-- ──────────────────────────────────────────────────────────────────────
-- Step 2 (added 2026-04-30): admin-managed rating
-- ──────────────────────────────────────────────────────────────────────
-- Adds a numeric rating column (0–5, allows decimals like 4.5).
-- Edit it manually in the Supabase Table Editor for each service.
-- Cards that have no rating set yet show a "New" badge instead.

alter table services add column if not exists rating numeric check (rating >= 0 and rating <= 5);

-- ──────────────────────────────────────────────────────────────────────
-- Step 3: scam reports table (added 2026-04-30)
-- ──────────────────────────────────────────────────────────────────────
-- Stores user-submitted scam reports. Admin reviews them in the Supabase
-- dashboard and only shares anonymized warnings on the public site —
-- never publishes accused parties' names directly (defamation risk).

create table if not exists scam_reports (
  id bigserial primary key,
  created_at timestamptz default now(),
  scam_type text not null,
  description text not null,
  region text,
  reporter_email text,
  approved boolean default false not null
);

alter table scam_reports enable row level security;

create policy "Anyone can submit a scam report"
  on scam_reports for insert
  to anon, authenticated
  with check (true);

-- No SELECT policy = reports are only readable via the Supabase dashboard.
-- This is intentional. Do NOT add a public SELECT — the data has names
-- that could expose you to defamation claims.

-- ──────────────────────────────────────────────────────────────────────
-- Step 4: jobs table (added 2026-04-30)
-- ──────────────────────────────────────────────────────────────────────

create table if not exists jobs (
  id bigserial primary key,
  created_at timestamptz default now(),
  title text not null,
  company text not null,
  description text not null,
  city text not null,
  language_required text not null,
  salary_range text,
  contract_type text,
  urgent boolean default false not null,
  contact_email text not null,
  application_link text,
  approved boolean default false not null
);

alter table jobs enable row level security;

create policy "Anyone can post a job"
  on jobs for insert
  to anon, authenticated
  with check (true);

create policy "Anyone can view approved jobs"
  on jobs for select
  to anon, authenticated
  using (approved = true);

-- ──────────────────────────────────────────────────────────────────────
-- Step 5: housing table (added 2026-04-30)
-- ──────────────────────────────────────────────────────────────────────

create table if not exists housing (
  id bigserial primary key,
  created_at timestamptz default now(),
  listing_type text not null,
  city text not null,
  neighborhood text,
  monthly_rent numeric not null,
  description text not null,
  bedrooms integer,
  available_from date,
  furnished boolean default false,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  approved boolean default false not null
);

alter table housing enable row level security;

create policy "Anyone can post a listing"
  on housing for insert
  to anon, authenticated
  with check (true);

create policy "Anyone can view approved housing"
  on housing for select
  to anon, authenticated
  using (approved = true);

-- ──────────────────────────────────────────────────────────────────────
-- Step 6: forum (added 2026-04-30)
-- ──────────────────────────────────────────────────────────────────────
-- Two tables: forum_threads (top-level posts) + forum_replies.
-- Threads default to approved=false (you review each new thread before it goes live).
-- Replies default to approved=true (faster UX; you can hide spam reactively).

create table if not exists forum_threads (
  id bigserial primary key,
  created_at timestamptz default now(),
  category text not null,
  title text not null,
  author_name text not null,
  author_email text,
  body text not null,
  pinned boolean default false not null,
  locked boolean default false not null,
  approved boolean default false not null
);

alter table forum_threads enable row level security;

create policy "Anyone can post a thread"
  on forum_threads for insert
  to anon, authenticated
  with check (true);

create policy "Anyone can view approved threads"
  on forum_threads for select
  to anon, authenticated
  using (approved = true);

create table if not exists forum_replies (
  id bigserial primary key,
  created_at timestamptz default now(),
  thread_id bigint not null references forum_threads(id) on delete cascade,
  author_name text not null,
  author_email text,
  body text not null,
  approved boolean default true not null
);

alter table forum_replies enable row level security;

create policy "Anyone can post a reply"
  on forum_replies for insert
  to anon, authenticated
  with check (true);

create policy "Anyone can view approved replies"
  on forum_replies for select
  to anon, authenticated
  using (approved = true);

create index if not exists forum_replies_thread_idx on forum_replies(thread_id);
create index if not exists forum_threads_created_idx on forum_threads(created_at desc);
