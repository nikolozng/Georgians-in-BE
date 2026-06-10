-- ============================================================
--  FIX_PRIVACY.sql — closes the public email leak (audit item #1)
--  Run ONCE in Supabase: Dashboard → SQL Editor → paste → Run.
--  Safe to re-run.
-- ============================================================

-- 1. profiles: no longer readable by everyone.
--    Members read their own row; admins read all (the admin panel
--    uses this for the member count).
drop policy if exists "Profiles are public" on profiles;

drop policy if exists "Users read own profile" on profiles;
create policy "Users read own profile"
  on profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "Admins read all profiles" on profiles;
create policy "Admins read all profiles"
  on profiles for select to authenticated
  using (public.is_admin());

-- 2. Scrub the emails already stored on forum posts.
--    (forum.html no longer sends author_email as of this fix —
--    admins can still identify an author via user_id.)
update forum_threads set author_email = null where author_email is not null;
update forum_replies set author_email = null where author_email is not null;
