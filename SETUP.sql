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
