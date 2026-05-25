-- ============================================================
--  geosin.be — ADMIN PANEL SETUP
--  Run this ONCE in Supabase: Dashboard -> SQL Editor -> New query
--  -> paste this whole file -> Run.
--  Safe to re-run: it uses "if not exists" / "drop policy if exists"
--  and only seeds content when the tables are still empty.
-- ============================================================

-- ---- 1. Add an admin flag to your profile ----
alter table profiles add column if not exists is_admin boolean not null default false;

-- ---- 2. Helper used by the security rules: is the current user an admin? ----
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---- 3. Make YOUR account the admin ----
--  Creates your profile row if needed and flips the admin flag on.
--  (If you ever change your login email, re-run this with the new address.)
insert into profiles (id, email, is_admin)
select id, email, true from auth.users where email = 'niccogigauri@gmail.com'
on conflict (id) do update set is_admin = true;

-- ---- 4. Let the admin moderate every content table ----
--  Postgres OR-combines policies, so these only ADD admin powers; normal
--  visitors and members keep exactly the access they had before.
alter table services enable row level security;
do $$
declare t text;
begin
  foreach t in array array['jobs','housing','forum_threads','forum_replies','events','services']
  loop
    execute format('drop policy if exists "Admins manage %1$s" on %1$I', t, t);
    execute format('create policy "Admins manage %1$s" on %1$I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- ---- 5a. Editable content: SCAM WARNING CARDS ----
create table if not exists scam_patterns (
  id          bigserial primary key,
  position    int not null default 0,
  title_en    text not null,
  title_ka    text,
  description  text not null,
  what_to_do  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists scam_patterns_pos_idx on scam_patterns(position);
alter table scam_patterns enable row level security;
drop policy if exists "Anyone can read scam patterns" on scam_patterns;
create policy "Anyone can read scam patterns" on scam_patterns
  for select to anon, authenticated using (true);
drop policy if exists "Admins manage scam patterns" on scam_patterns;
create policy "Admins manage scam patterns" on scam_patterns
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- 5b. Editable content: CHECKLIST STEPS ----
create table if not exists checklist_items (
  id          bigserial primary key,
  list_key    text not null,          -- 'arrived' | 'job' | 'business'
  position    int not null default 0,
  title_en    text not null,
  title_ka    text,
  description  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists checklist_items_list_idx on checklist_items(list_key, position);
alter table checklist_items enable row level security;
drop policy if exists "Anyone can read checklist items" on checklist_items;
create policy "Anyone can read checklist items" on checklist_items
  for select to anon, authenticated using (true);
drop policy if exists "Admins manage checklist items" on checklist_items;
create policy "Admins manage checklist items" on checklist_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- 6. Keep updated_at fresh whenever you edit content ----
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_touch_scam on scam_patterns;
create trigger trg_touch_scam before update on scam_patterns
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_touch_check on checklist_items;
create trigger trg_touch_check before update on checklist_items
  for each row execute function public.touch_updated_at();

-- ---- 7. Seed the starting content (only runs if the tables are empty) ----
do $$ begin
  if not exists (select 1 from scam_patterns) then
    insert into scam_patterns (position, title_en, title_ka, description, what_to_do) values
    (1, 'Apartment "deposit" before viewing', 'ბინის ''დეპოზიტი'' ნახვამდე', '"Send €1,500 deposit to secure the flat — I''m in another city, my cousin will give you keys." Photos are real (stolen from Immoweb). Once you transfer, the "landlord" disappears.', 'Never pay before viewing in person. Demand the blocked-account procedure (huurwaarborg / garantie locative). Cash to a stranger = gone.'),
    (2, '"Fast track" residence permit', 'ბინადრობის ნებართვის დაჩქარებული წესით მიღება', 'Someone claiming connections at the commune offers to "speed up" your residence card for €500–€2000 cash. The commune doesn''t take cash and doesn''t have a fast track. You lose the money.', 'All commune processes are free or have published fees. If someone asks for cash off-the-books, they''re lying.'),
    (3, 'Fake job offer with "registration fee"', 'ყალბი სამუშაო შეთავაზება', '"Construction job, €15/hour, but you need to pay €200 registration first." Real employers never charge candidates. Some demand a passport copy first, then sell the data.', 'No real job costs you money to start. Never send your full passport scan unless you''ve signed a contract.'),
    (4, '"I''ll lend you money — sign here"', NULL, 'An "older Georgian" offers an informal loan with a contract you can''t read in Dutch/French. The contract often hides 30–50% interest, or transfers your future wages directly to them.', 'Never sign a contract you can''t read. Use a Belgian bank, a credit union, or licensed microcredit (e.g. Microstart). Get the contract translated by a sworn translator.'),
    (5, 'Cash-paid work without contract', NULL, 'Worker arrives, does the job, employer pays in cash, no contract, no payslip. Then refuses to pay the last weeks. With no contract, you can''t prove you ever worked there.', 'Always require a signed contract before starting. Cash-only is illegal beyond €3,000/month and leaves you with zero protection.'),
    (6, 'Money transfer "for a friend"', 'ფულის გადარიცხვა მეგობრისთვის', 'Someone you barely know asks you to receive a payment in your bank account "because their card has issues" — and to forward it to a third party. This is money laundering. <em>You</em> are the criminal record.', 'Never let your bank account be used to receive and forward money for someone else, even a fellow Georgian. Belgian banks flag this within days.'),
    (7, 'Fake police / tax office calls', NULL, '"This is the Federal Police — pay this fine in vouchers immediately or you''ll be deported." Real Belgian police never ask for payments by phone, never use crypto/vouchers, and never threaten deportation by phone.', 'Hang up. Call 101 (police) directly to verify. Real notices come by registered mail, never by phone or WhatsApp.'),
    (8, 'Fake mutuality / utilities at the door', NULL, 'Someone in a uniform-looking jacket says they''re from your mutuality / energy company and need your eID + bank card "to update your file." Sometimes followed by withdrawals from your account.', 'Never give your eID PIN or bank card to anyone at your door. Real institutions don''t do door-to-door verification.');
  end if;
  if not exists (select 1 from checklist_items) then
    insert into checklist_items (list_key, position, title_en, title_ka, description) values
    ('arrived', 1, 'Register at your commune within 8 days', 'დარეგისტრირდით კომუნაში 8 დღის ვადაში', 'Bring passport, rental contract or host declaration, and a few passport photos. The commune is <em>gemeentehuis</em> (Flanders) or <em>maison communale</em> (Wallonia/Brussels).'),
    ('arrived', 2, 'Receive your "Annex 3" temporary certificate', NULL, 'Issued by the commune at registration. Keep it safe — it''s your provisional ID.'),
    ('arrived', 3, 'Pass the police home visit', 'გაიარეთ პოლიციის შემოწმება საცხოვრებელ მისამართზე', 'An officer will come to verify you actually live at the registered address. Be reachable in the first weeks. If you miss them, leave a note with your phone number on the door.'),
    ('arrived', 4, 'Collect your electronic residence card (eID)', NULL, 'Once police verifies, the commune issues your physical card. You''ll set PIN/PUK codes — keep them.'),
    ('arrived', 5, 'Open a starter bank account', NULL, 'Online banks (Wise, Revolut, N26) accept just a passport. Switch to a Belgian bank (KBC, ING, BNP, Belfius) once you have your eID and address.'),
    ('arrived', 6, 'Register with a health insurance fund (mutualité / ziekenfonds)', NULL, 'Mandatory once you have a national registration number. Pick CM, Mutualité Neutre, or another fund. Bring eID and proof of registration.'),
    ('arrived', 7, 'Get a Belgian SIM card', NULL, 'Cheapest options: Mobile Vikings, Hey!, Scarlet. Prepaid is fine to start. Belgian phone numbers needed for many services.'),
    ('arrived', 8, 'Buy a MOBIB transport card', NULL, 'For STIB (Brussels), De Lijn (Flanders), or TEC (Wallonia). One card, multiple operators. Top up online or at stations.'),
    ('arrived', 9, 'Pick a GP (huisarts / médecin généraliste)', NULL, 'Belgium uses a GP-first system. Your GP issues referrals to specialists. Some Georgian-speaking GPs are listed on our Services page.'),
    ('arrived', 10, 'Sign up for free Dutch or French classes', NULL, '<em>Het Huis van het Nederlands</em> for Dutch (Flanders/Brussels). <em>Lire et Écrire</em> and your commune for French (Wallonia/Brussels). Heavily subsidised — €30–€100/semester.'),
    ('arrived', 11, 'Enrol kids in school (if applicable)', NULL, 'Brussels: <em>Service d''Inscription</em>. Flanders: <em>Inschrijven</em> online. Apply early — popular schools fill up fast. Ask about <em>OKAN</em> / <em>DASPA</em> classes for non-Dutch/French speakers.'),
    ('arrived', 12, 'Exchange your Georgian driving licence within 2 years', NULL, 'Belgium and Georgia have a bilateral agreement. Apply at your commune with your Georgian licence, eID, and a small fee. After 2 years you have to redo theory + practical exams from scratch.'),
    ('job', 1, 'Update your CV in Europass format', 'განაახლეთ თქვენი CV Europass ფორმატში', 'The standard EU CV format. Free generator at <a href="https://europa.eu/europass/" rel="noopener" target="_blank">europa.eu/europass</a>. Belgian recruiters expect this layout.'),
    ('job', 2, 'Get your Georgian qualifications recognized (NARIC)', NULL, 'Required for regulated professions (medicine, law, engineering, teaching). Process takes 2–4 months. Start early.'),
    ('job', 3, 'Register with your regional employment office', NULL, 'VDAB (Flanders), Le Forem (Wallonia), Actiris (Brussels). Free coaching, job matching, and access to subsidised training.'),
    ('job', 4, 'Optimise your LinkedIn profile', NULL, 'Set location to Belgium, language to English, and turn on "Open to work". Belgian recruiters check LinkedIn first.'),
    ('job', 5, 'Target English-friendly sectors', NULL, 'Tech, EU institutions, finance/consulting, hospitality, logistics. These don''t always require Dutch or French.'),
    ('job', 6, 'Browse the main job boards', NULL, 'StepStone.be, LinkedIn, Indeed.be, BrusselsJobs.com, EU Careers (epso.europa.eu), Glassdoor.'),
    ('job', 7, 'Confirm work permit path (if non-EU)', NULL, 'Belgium uses a "single permit" system: the employer applies on your behalf for a combined work + residence permit. Highly-qualified workers and researchers have faster tracks.'),
    ('job', 8, 'Submit Single Permit application once hired', NULL, 'Your employer initiates this. Processing typically 2–4 months. While you wait, your eID stays valid.'),
    ('job', 9, 'Prepare for Belgian-style interviews', NULL, 'Research salary range on StepStone or Glassdoor. Interviews are formal but not rigid. Belgians are direct — be specific and concrete.'),
    ('job', 10, 'Set up SEPA direct deposit', NULL, 'Once hired, give your employer your Belgian IBAN. Salary is paid monthly, end of month, into your account.'),
    ('business', 1, 'Decide your legal structure', 'ჩამოყალიბდით ბიზნესის სამართლებრივ ფორმაზე', 'Self-employed (<em>zelfstandige</em>): cheapest, full personal liability. SRL/BV: limited liability, ~€18,500 minimum capital effectively, more admin. Talk to a Belgian accountant before choosing.'),
    ('business', 2, 'Find your NACE code', NULL, 'Official activity classification (e.g. 62.01 for software dev). Look up at <a href="https://statbel.fgov.be/" rel="noopener" target="_blank">statbel.fgov.be</a>. You''ll need this for every official form.'),
    ('business', 3, 'Apply for "Carte Professionnelle" (non-EU only)', NULL, 'Required for non-EU citizens running their own business. Apply at the Belgian embassy before arrival, or at the regional office after registration.'),
    ('business', 4, 'Register at a Business Counter', NULL, 'Pick one: Liantis, Acerta, Securex, Partena, or Xerius. Costs ~€100. They register you in the Crossroads Bank for Enterprises (BCE/KBO) and assign your company number.'),
    ('business', 5, 'Apply for VAT number', NULL, 'Through the Business Counter or directly at FOD Financiën / SPF Finances. Mandatory if turnover &gt; €25,000/year. Below that you can opt for the small-business VAT exemption.'),
    ('business', 6, 'Affiliate with a social insurance fund', NULL, 'Mandatory for the self-employed. Same providers as Business Counters. Contributions are ~20% of your net taxable income, with quarterly payments.'),
    ('business', 7, 'Open a separate business bank account', NULL, 'Required for SRL/BV, strongly recommended for self-employed (cleaner accounting). Most Belgian banks have a "Pro" tier; online options like Qonto also work.'),
    ('business', 8, 'Get business liability insurance', NULL, 'Required by law for many activities (consulting, healthcare, construction, etc.). Cheap basic policies start ~€200/year.'),
    ('business', 9, 'Set up bookkeeping', NULL, 'Hire a Belgian accountant (~€80–150/month for self-employed) or use software like Yuki, Octopus, or Accountable. Invoices, expenses, and VAT all flow through here.'),
    ('business', 10, 'File quarterly VAT and annual income tax', NULL, 'VAT returns: 4× per year. Income tax: once a year, usually June–July. An accountant handles deadlines for you.');
  end if;
end $$;
-- ============================================================
--  OPTIONAL — route ALL new posts through your review queue
-- ------------------------------------------------------------
--  Right now, posts by logged-in members go LIVE instantly, so your
--  review queue mainly catches anonymous service submissions.
--  If you'd rather approve EVERY new post first, remove the "-- " from
--  the four lines below and run them. (Re-run Step 8 of SETUP.sql to undo.)
--
-- drop trigger if exists trg_auto_approve_jobs    on jobs;
-- drop trigger if exists trg_auto_approve_housing on housing;
-- drop trigger if exists trg_auto_approve_threads on forum_threads;
-- drop trigger if exists trg_auto_approve_events  on events;
-- ============================================================
