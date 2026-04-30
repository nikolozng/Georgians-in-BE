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
