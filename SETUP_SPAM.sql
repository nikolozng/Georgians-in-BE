-- ═══════════════════════════════════════════════════════════════════
-- SETUP_SPAM.sql  — Spam Prevention Database Setup
-- Run this ONCE in the Supabase SQL Editor:
--   Dashboard → SQL Editor → New query → paste → Run
-- ═══════════════════════════════════════════════════════════════════
--
-- What this adds:
--   1. ip_signups table              — tracks IPs at signup for rate limiting
--                                      (read/write restricted to Edge Function only)
--   2. count_user_posts_today()      — counts a user's posts in the last 24h
--   3. RESTRICTIVE RLS policies on   — max 3 combined posts/day across
--      jobs + housing tables            jobs + housing (server-enforced)
-- ═══════════════════════════════════════════════════════════════════


-- ── 1. IP signups tracking table ────────────────────────────────────────────
-- The signup-check Edge Function inserts a row here on every successful signup.
-- No anon/authenticated RLS policies = only the service role (Edge Function) can access it.

CREATE TABLE IF NOT EXISTS ip_signups (
  id         bigserial   PRIMARY KEY,
  ip         text        NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE ip_signups ENABLE ROW LEVEL SECURITY;
-- (Intentionally no policies — locked to service role only)

CREATE INDEX IF NOT EXISTS idx_ip_signups_ip_time ON ip_signups (ip, created_at DESC);


-- ── 2. Helper function: count a user's posts today ──────────────────────────
-- Returns total posts by this user in jobs + housing in the last 24 hours.
-- SECURITY DEFINER so it can query both tables regardless of caller's role.

CREATE OR REPLACE FUNCTION count_user_posts_today(uid uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT (
    (SELECT COUNT(*)::int FROM jobs    WHERE user_id = uid AND created_at > NOW() - INTERVAL '24 hours') +
    (SELECT COUNT(*)::int FROM housing WHERE user_id = uid AND created_at > NOW() - INTERVAL '24 hours')
  );
$$;


-- ── 3. Rate-limit RLS policies (RESTRICTIVE) ────────────────────────────────
-- RESTRICTIVE policies are ANDed with regular policies — the user must pass
-- both the "Logged-in users post jobs" policy AND this rate limit.
-- This means the database itself rejects the insert when the limit is exceeded.

-- Jobs
DROP POLICY IF EXISTS "post_rate_limit_jobs" ON jobs;
CREATE POLICY "post_rate_limit_jobs" ON jobs
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (count_user_posts_today(auth.uid()) < 3);

-- Housing
DROP POLICY IF EXISTS "post_rate_limit_housing" ON housing;
CREATE POLICY "post_rate_limit_housing" ON housing
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (count_user_posts_today(auth.uid()) < 3);
