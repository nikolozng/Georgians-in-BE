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

-- ──────────────────────────────────────────────────────────────────────
-- Step 7: user accounts + profiles (added 2026-05-04)
-- ──────────────────────────────────────────────────────────────────────
-- Supabase already has auth.users built in (filled automatically when
-- people sign up). We just add a `profiles` table for our extra data:
-- the chosen incognito name used on the forum.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  email text,
  display_name text,        -- shown on forum when NOT incognito
  incognito_name text not null
);

-- (If profiles already existed before display_name was added)
alter table profiles add column if not exists display_name text;

alter table profiles enable row level security;

create policy "Profiles are public"
  on profiles for select
  to anon, authenticated
  using (true);

create policy "Users insert own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

-- ──────────────────────────────────────────────────────────────────────
-- Step 8: tie posts to user accounts + allow self-delete
-- ──────────────────────────────────────────────────────────────────────

alter table jobs              add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table housing           add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table forum_threads     add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table forum_replies     add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table forum_threads     add column if not exists incognito boolean default false not null;
alter table forum_replies     add column if not exists incognito boolean default false not null;

drop policy if exists "Anyone can post a job"           on jobs;
drop policy if exists "Anyone can post a listing"       on housing;
drop policy if exists "Anyone can post a thread"        on forum_threads;
drop policy if exists "Anyone can post a reply"         on forum_replies;

create policy "Logged-in users post jobs"
  on jobs for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Logged-in users post housing"
  on housing for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Logged-in users post threads"
  on forum_threads for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Logged-in users post replies"
  on forum_replies for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users delete own jobs"
  on jobs for delete to authenticated
  using (auth.uid() = user_id);

create policy "Users delete own housing"
  on housing for delete to authenticated
  using (auth.uid() = user_id);

create policy "Users delete own threads"
  on forum_threads for delete to authenticated
  using (auth.uid() = user_id);

create policy "Users delete own replies"
  on forum_replies for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Anyone can view approved jobs"     on jobs;
drop policy if exists "Anyone can view approved housing"  on housing;
drop policy if exists "Anyone can view approved threads"  on forum_threads;
drop policy if exists "Anyone can view approved replies"  on forum_replies;

create policy "View approved jobs or own jobs"
  on jobs for select to anon, authenticated
  using (approved = true or auth.uid() = user_id);

create policy "View approved housing or own"
  on housing for select to anon, authenticated
  using (approved = true or auth.uid() = user_id);

create policy "View approved threads or own"
  on forum_threads for select to anon, authenticated
  using (approved = true or auth.uid() = user_id);

create policy "View approved replies or own"
  on forum_replies for select to anon, authenticated
  using (approved = true or auth.uid() = user_id);

-- Auto-approve posts by authenticated users (skip the moderation queue).
create or replace function auto_approve_authenticated()
returns trigger language plpgsql as $$
begin
  if new.user_id is not null then
    new.approved := true;
  end if;
  return new;
end $$;

drop trigger if exists trg_auto_approve_jobs    on jobs;
drop trigger if exists trg_auto_approve_housing on housing;
drop trigger if exists trg_auto_approve_threads on forum_threads;
drop trigger if exists trg_auto_approve_replies on forum_replies;

create trigger trg_auto_approve_jobs    before insert on jobs           for each row execute function auto_approve_authenticated();
create trigger trg_auto_approve_housing before insert on housing        for each row execute function auto_approve_authenticated();
create trigger trg_auto_approve_threads before insert on forum_threads  for each row execute function auto_approve_authenticated();
create trigger trg_auto_approve_replies before insert on forum_replies  for each row execute function auto_approve_authenticated();

-- ──────────────────────────────────────────────────────────────────────
-- Step 9: notifications (added 2026-05-04)
-- ──────────────────────────────────────────────────────────────────────
-- In-app notifications. When someone replies to your thread, a row is
-- created here. The dashboard shows unread ones with a badge in the nav.

create table if not exists notifications (
  id bigserial primary key,
  created_at timestamptz default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read boolean default false not null
);

create index if not exists notifications_user_idx on notifications(user_id, created_at desc);

alter table notifications enable row level security;

create policy "Users read own notifications"
  on notifications for select to authenticated
  using (auth.uid() = user_id);

create policy "Users update own notifications"
  on notifications for update to authenticated
  using (auth.uid() = user_id);

create policy "Users delete own notifications"
  on notifications for delete to authenticated
  using (auth.uid() = user_id);

-- When someone posts a forum reply, notify the thread author.
create or replace function notify_thread_author_on_reply()
returns trigger language plpgsql security definer as $$
declare
  thread_owner uuid;
  reply_author_name text;
begin
  select user_id into thread_owner from forum_threads where id = new.thread_id;

  if thread_owner is null or thread_owner = new.user_id then
    return new;
  end if;

  if new.incognito then
    select incognito_name into reply_author_name from profiles where id = new.user_id;
  else
    reply_author_name := new.author_name;
  end if;

  insert into notifications (user_id, type, title, body, link)
  values (
    thread_owner,
    'reply',
    coalesce(reply_author_name, 'Someone') || ' replied to your thread',
    left(new.body, 160),
    '/forum.html?thread=' || new.thread_id
  );

  return new;
end $$;

drop trigger if exists trg_notify_reply on forum_replies;
create trigger trg_notify_reply
  after insert on forum_replies
  for each row execute function notify_thread_author_on_reply();
