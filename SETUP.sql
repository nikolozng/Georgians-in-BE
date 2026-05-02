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
