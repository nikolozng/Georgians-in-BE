-- ═══════════════════════════════════════════════════════════════════
-- SETUP_BLOG.sql — the blog, managed from admin.html
-- Run ONCE in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run: uses "if not exists" / "drop policy if exists", and the
-- first post is only seeded if that slug isn't in the table yet.
--
-- Requires SETUP_ADMIN.sql to have been run first (it creates the
-- public.is_admin() helper that every policy below reuses).
-- ═══════════════════════════════════════════════════════════════════

-- ---- 0. Friendly stop if the admin setup hasn't been run yet ----
do $$ begin
  if to_regprocedure('public.is_admin()') is null then
    raise exception 'public.is_admin() is missing — run SETUP_ADMIN.sql first, then re-run this file.';
  end if;
end $$;


-- ---- 1. The posts table ----
create table if not exists blog_posts (
  id            bigserial primary key,
  slug          text not null unique,
  status        text not null default 'draft' check (status in ('draft','published')),
  published_at  timestamptz,
  tags          text[] not null default '{}',      -- 'news' | 'guide'
  title_ka      text,
  title_en      text not null,
  summary_ka    text,
  summary_en    text,
  body_ka       text,                              -- markdown
  body_en       text,                              -- markdown
  image_url     text,                              -- hero photo (blog-images bucket)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- The public /blog index reads exactly this: published posts, newest first.
create index if not exists blog_posts_published_idx
  on blog_posts (status, published_at desc);


-- ---- 2. Who can read and write ----
alter table blog_posts enable row level security;

-- Visitors (and the Cloudflare Worker, which uses the anon key) see published posts only.
drop policy if exists "Anyone can read published blog posts" on blog_posts;
create policy "Anyone can read published blog posts" on blog_posts
  for select to anon, authenticated
  using (status = 'published');

-- Admins can read drafts too, and are the only ones who can write.
-- Same pattern as SETUP_ADMIN.sql / SETUP_PLACES.sql.
drop policy if exists "Admins manage blog posts" on blog_posts;
create policy "Admins manage blog posts" on blog_posts
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- ---- 3. Keep updated_at fresh (helper also defined in SETUP_ADMIN.sql) ----
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_touch_blog on blog_posts;
create trigger trg_touch_blog before update on blog_posts
  for each row execute function public.touch_updated_at();


-- ---- 4. Storage bucket for hero photos: public read, admin-only write ----
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can view blog images" on storage.objects;
create policy "Anyone can view blog images" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'blog-images');

drop policy if exists "Admins upload blog images" on storage.objects;
create policy "Admins upload blog images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'blog-images' and public.is_admin());

drop policy if exists "Admins update blog images" on storage.objects;
create policy "Admins update blog images" on storage.objects
  for update to authenticated
  using (bucket_id = 'blog-images' and public.is_admin())
  with check (bucket_id = 'blog-images' and public.is_admin());

drop policy if exists "Admins delete blog images" on storage.objects;
create policy "Admins delete blog images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'blog-images' and public.is_admin());


-- ═══════════════════════════════════════════════════════════════════
-- 5. Migrate the one post that used to be a static HTML file
--    (blog/exchange-georgian-driving-licence-belgium.html)
--    Same slug and same publish date, so Google keeps the ranking.
-- ═══════════════════════════════════════════════════════════════════
insert into blog_posts (slug, status, published_at, tags, title_en, title_ka, summary_en, summary_ka, body_en, body_ka)
values (
  'exchange-georgian-driving-licence-belgium',
  'published',
  '2026-08-06T09:00:00Z',
  array['guide'],
  'How to exchange a Georgian driving licence in Belgium',
  'როგორ გავცვალოთ ქართული მართვის მოწმობა ბელგიაში',
  $sen$Georgia is on Belgium's recognised list, so you can exchange your licence at the commune instead of retaking the exams — if you apply at the right moment. The 185-day rule, documents, cost and what you give up.$sen$,
  $ska$საქართველო ბელგიის აღიარებულ სიაშია, ამიტომ მოწმობის გაცვლა კომუნაში შეგიძლიათ გამოცდების თავიდან ჩაბარების გარეშე — თუ სწორ მომენტში მიმართავთ. 185 დღის წესი, საბუთები, ღირებულება და ის, რასაც კარგავთ.$ska$,
$ben$Good news first: Georgia is on Belgium's official list of countries whose driving licences are recognised. That means you can normally **exchange** your Georgian licence at your commune — you do not have to sit the Belgian theory and practical exams from scratch.

The catch is that the procedure is slower and stricter than most people expect, and one of its rules can quietly disqualify you if you apply at the wrong moment. Here is how it actually works.

## The 185-day rule cuts both ways

This single number governs the whole process, and it applies twice.

**Before 185 days.** For the first 185 days after you register at your commune, you may keep driving on your valid Georgian licence. Nothing needs to happen yet.

**After 185 days.** Belgium can only issue you a Belgian licence once you have been registered here for 185 days. You may start the exchange procedure during that waiting period — and it is worth doing, because the authenticity check is slow — but the card itself will not be handed over until the 185 days are up.

> **The rule that catches people out:** your Georgian licence must have been *issued* during a period when you were *not* already registered in Belgium for 185 days or more. If you flew home to Tbilisi to renew your licence after settling in Belgium, that new licence cannot be exchanged. Only the date of issue, renewal, replacement or first issue counts.

## What your commune will check

- **Recognition.** Georgia is on the recognised list, but the commune also checks that your specific licence *model* is one Belgium holds a specimen of. Older or unusual models can fail this step.
- **Validity.** The licence and the categories on it must still be valid when the procedure starts.
- **The original only.** No international driving permits, no provisional licences, no photocopies. The card must be in good condition. Replacement certificates are not accepted as proof of authenticity.
- **Proof of residence.** If you are a Georgian citizen with a Georgian licence, you do not need to prove anything extra. If you hold a different nationality, you must prove you actually lived in Georgia for at least 185 days during the year the licence was issued — rental contracts, payslips, utility bills or a residence certificate. Embassy certificates are not accepted.
- **Authenticity.** Every non-European licence is sent to the Federal Police for verification. This takes several weeks, and it is the main reason the process drags.
- **Translation.** Your commune may ask for a sworn translation, which must be done by a sworn translator *in Belgium*. A translation made in Georgia will usually be refused.

## Cost and timing

The federal fee for the Belgian licence is **€20**, plus a municipal tax that varies by commune — Brussels, for example, charges €38 for the licence plus €5 for the authenticity investigation. Budget somewhere in the €25–45 range and confirm with your own commune.

On timing, plan for months rather than weeks. Brussels estimates around two months just for the exchange request and authentication, then about five working days to produce the card. Start early.

## Two things you give up

**You will not get your Georgian licence back.** Belgium keeps it. If that matters to you sentimentally or practically — for driving in Georgia on visits — think it through before you hand it over.

**Categories you gained later do not transfer.** Only the categories that were on the licence at its date of issue can be carried across. If you added a motorcycle category afterwards on the same card, expect to lose it.

## If your licence cannot be exchanged

Some licences are recognised for driving but still not exchangeable — most often because Belgium has no official specimen of that model. In that case there is no shortcut: you take the Belgian theory and practical exams, through the Flemish, Walloon or Brussels-Capital region depending on where you live.

Rules and lists do change, so check the FPS Mobility page and your commune's own instructions before you go. Communes differ in appointment systems and in what they ask for, and the person at the counter has the final say.

---

Sources, checked 6 August 2026: FPS Mobility & Transport — [Recognition of foreign driving licences](https://mobilit.belgium.be/en/road/driving/driving-licences/foreign-driving-licences) and the [list of recognised non-EU countries](https://mobilit.belgium.be/nl/weg/rijden/rijbewijzen/info-voor-gemeente/lijst-van-landen-en-regios-buiten-de-europese-unie) (Georgia listed as "Georgië / GE"); [City of Brussels](https://www.brussels.be/non-european-driving-licence-exchange) for local fees and timing. This is general information, not legal advice — your commune decides.$ben$,
$bka$დავიწყოთ კარგი ამბით: საქართველო შედის იმ ქვეყნების ოფიციალურ სიაში, რომელთა მართვის მოწმობებსაც ბელგია აღიარებს. ეს ნიშნავს, რომ ქართული მოწმობა, როგორც წესი, შეგიძლიათ **გაცვალოთ** თქვენს კომუნაში — თეორიისა და პრაქტიკის გამოცდების თავიდან ჩაბარება არ დაგჭირდებათ.

პრობლემა ისაა, რომ პროცედურა უფრო ნელი და მკაცრია, ვიდრე ადამიანების უმეტესობა ელოდება, და ერთ-ერთმა წესმა შეიძლება უბრალოდ ჩაგაგდოთ, თუ არასწორ მომენტში მიმართავთ. აი, როგორ მუშაობს ეს სინამდვილეში.

## 185 დღის წესი ორივე მხარეს მოქმედებს

სწორედ ეს ერთი რიცხვი განსაზღვრავს მთელ პროცესს — და ორჯერ მოქმედებს.

**185 დღემდე.** კომუნაში რეგისტრაციიდან პირველი 185 დღის განმავლობაში შეგიძლიათ განაგრძოთ ტარება მოქმედი ქართული მოწმობით. ჯერჯერობით არაფრის გაკეთება არ გჭირდებათ.

**185 დღის შემდეგ.** ბელგიას თქვენთვის ბელგიური მოწმობის გაცემა მხოლოდ მაშინ შეუძლია, როცა უკვე 185 დღეა აქ ხართ რეგისტრირებული. განაცხადის შეტანა ამ ლოდინის პერიოდშივე შეგიძლიათ — და ღირს კიდეც, რადგან ავთენტურობის შემოწმება ნელია — მაგრამ თავად ბარათს 185 დღის გასვლამდე არ მოგცემენ.

> **წესი, რომელზეც ხალხი ყველაზე ხშირად ებმევა:** თქვენი ქართული მოწმობა *გაცემული* უნდა იყოს იმ პერიოდში, როცა ბელგიაში 185 დღეზე მეტი ხნით *არ* იყავით რეგისტრირებული. თუ ბელგიაში დამკვიდრების შემდეგ თბილისში ჩახვედით მოწმობის განსაახლებლად, ის ახალი მოწმობა გაცვლას აღარ ექვემდებარება. მნიშვნელობა აქვს მხოლოდ გაცემის, განახლების, შეცვლის ან პირველად გაცემის თარიღს.

## რას შეამოწმებს კომუნა

- **აღიარება.** საქართველო აღიარებულ სიაშია, მაგრამ კომუნა ასევე ამოწმებს, რომ თქვენი კონკრეტული *მოდელი* იმ ნიმუშებს შორისაა, რომლებიც ბელგიას აქვს. ძველმა ან იშვიათმა მოდელებმა შეიძლება ვერ გაიაროს ეს ეტაპი.
- **ვადა.** მოწმობა და მასზე მითითებული კატეგორიები პროცედურის დაწყების მომენტში მოქმედი უნდა იყოს.
- **მხოლოდ ორიგინალი.** არც საერთაშორისო მოწმობა, არც დროებითი, არც ასლი. ბარათი კარგ მდგომარეობაში უნდა იყოს. შემცვლელი ცნობები ავთენტურობის დასადასტურებლად არ მიიღება.
- **საცხოვრებლის დადასტურება.** თუ საქართველოს მოქალაქე ხართ ქართული მოწმობით, დამატებით არაფრის დამტკიცება არ გჭირდებათ. თუ სხვა ქვეყნის მოქალაქე ხართ, უნდა დაამტკიცოთ, რომ მოწმობის გაცემის წელს საქართველოში ნამდვილად ცხოვრობდით სულ მცირე 185 დღე — ქირის ხელშეკრულება, ხელფასის ფურცლები, კომუნალური გადასახადები ან საცხოვრებლის ცნობა. საელჩოს ცნობები არ მიიღება.
- **ავთენტურობა.** ყველა არაევროპული მოწმობა მოწმდება ფედერალურ პოლიციაში. ეს რამდენიმე კვირას იღებს და სწორედ ესაა პროცესის გაჭიანურების მთავარი მიზეზი.
- **თარგმანი.** კომუნამ შეიძლება მოითხოვოს ნაფიცი თარგმანი, რომელიც შესრულებული უნდა იყოს *ბელგიაში* მოღვაწე ნაფიცი თარჯიმნის მიერ. საქართველოში გაკეთებულ თარგმანს, როგორც წესი, არ მიიღებენ.

## ღირებულება და ვადები

ბელგიური მოწმობის ფედერალური მოსაკრებელი **20 ევროა**, პლუს მუნიციპალური გადასახადი, რომელიც კომუნების მიხედვით განსხვავდება — მაგალითად, ბრიუსელი მოწმობაში 38 ევროს იღებს, პლუს 5 ევრო ავთენტურობის შემოწმებისთვის. გათვალეთ დაახლოებით 25–45 ევრო და დააზუსტეთ თქვენს კომუნაში.

რაც შეეხება დროს, დაგეგმეთ თვეებით და არა კვირებით. ბრიუსელი მხოლოდ განაცხადსა და ავთენტიფიკაციაზე დაახლოებით ორ თვეს ითვლის, შემდეგ კი ბარათის დამზადებას კიდევ ხუთიოდე სამუშაო დღე სჭირდება. დაიწყეთ ადრე.

## ორი რამ, რასაც კარგავთ

**ქართულ მოწმობას უკან აღარ დაგიბრუნებენ.** ბელგია მას იტოვებს. თუ ეს თქვენთვის მნიშვნელოვანია — ემოციურად ან პრაქტიკულად, საქართველოში ვიზიტებისას ტარებისთვის — კარგად დაფიქრდით ჩაბარებამდე.

**მოგვიანებით დამატებული კატეგორიები არ გადადის.** გადატანა შესაძლებელია მხოლოდ იმ კატეგორიების, რომლებიც მოწმობაზე მისი გაცემის თარიღისთვის იყო. თუ იმავე ბარათზე მოტოციკლის კატეგორია მოგვიანებით დაამატეთ, სავარაუდოდ დაკარგავთ.

## თუ მოწმობა გაცვლას არ ექვემდებარება

ზოგიერთი მოწმობა აღიარებულია ტარებისთვის, მაგრამ მაინც არ ექვემდებარება გაცვლას — ყველაზე ხშირად იმიტომ, რომ ბელგიას ამ მოდელის ოფიციალური ნიმუში არ აქვს. ამ შემთხვევაში შემოვლითი გზა არ არსებობს: ჩააბარებთ ბელგიურ თეორიულ და პრაქტიკულ გამოცდებს — ფლანდრიის, ვალონიის ან ბრიუსელის რეგიონის მეშვეობით, იმის მიხედვით, სად ცხოვრობთ.

წესები და სიები იცვლება, ამიტომ წასვლამდე გადაამოწმეთ ფედერალური მობილობის სამსახურის გვერდი და თქვენივე კომუნის ინსტრუქციები. კომუნები განსხვავდებიან როგორც ჩაწერის სისტემით, ისე მოთხოვნილი დოკუმენტებით, და საბოლოო სიტყვა სწორედ ფანჯარასთან მჯდომ თანამშრომელს ეკუთვნის.

---

წყაროები, გადამოწმებულია 2026 წლის 6 აგვისტოს: მობილობისა და ტრანსპორტის ფედერალური სამსახური — [უცხოური მართვის მოწმობების აღიარება](https://mobilit.belgium.be/en/road/driving/driving-licences/foreign-driving-licences) და [აღიარებულ არაევროპულ ქვეყნათა სია](https://mobilit.belgium.be/nl/weg/rijden/rijbewijzen/info-voor-gemeente/lijst-van-landen-en-regios-buiten-de-europese-unie) (საქართველო მითითებულია როგორც „Georgië / GE“); [ქალაქ ბრიუსელის](https://www.brussels.be/non-european-driving-licence-exchange) გვერდი ადგილობრივი ტარიფებისა და ვადებისთვის. ეს ზოგადი ინფორმაციაა და არა იურიდიული რჩევა — საბოლოო გადაწყვეტილებას თქვენი კომუნა იღებს.$bka$
)
on conflict (slug) do nothing;


-- ---- Done. Check it landed: ----
-- select slug, status, published_at, tags, title_en from blog_posts;
