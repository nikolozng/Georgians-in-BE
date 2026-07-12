-- ═══════════════════════════════════════════════════════════════════
-- SETUP_GUIDES.sql — "Guides — Life in Belgium" Q&A knowledge base
-- Run ONCE in Supabase: Dashboard → SQL Editor → paste → Run.
-- Safe to re-run (seed only inserts when the table is empty).
-- Requires SETUP_ADMIN.sql to have been run first (public.is_admin()).
--
-- ⚠️ Answers marked [TODO: verify] contain rules Nikoloz should
--    double-check before relying on them. Edit them in the admin panel.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists guide_items (
  id bigserial primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  category text not null,      -- arrival | housing | work | healthcare | schools | money | driving | language
  question_en text not null,
  question_ka text,
  answer_en text not null,     -- may contain basic HTML (links)
  answer_ka text,
  position int not null default 0
);

create index if not exists guide_items_cat_idx on guide_items(category, position);

alter table guide_items enable row level security;

drop policy if exists "Anyone can read guide items" on guide_items;
create policy "Anyone can read guide items" on guide_items
  for select to anon, authenticated using (true);

drop policy if exists "Admins manage guide items" on guide_items;
create policy "Admins manage guide items" on guide_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop trigger if exists trg_touch_guide_items on guide_items;
create trigger trg_touch_guide_items
  before update on guide_items
  for each row execute function public.touch_updated_at();

-- ── Seed content (only when empty) ─────────────────────────────────
do $$
begin
if (select count(*) from guide_items) = 0 then

insert into guide_items (category, position, question_en, question_ka, answer_en, answer_ka) values

-- ═══ ARRIVAL & PAPERWORK ═══
('arrival', 1,
 'Do I need a visa to live and work in Belgium?',
 'მჭირდება თუ არა ვიზა ბელგიაში საცხოვრებლად და სამუშაოდ?',
 'Georgian citizens can enter Schengen visa-free for 90 days in any 180-day period. For longer stays or work, apply for a long-stay D visa at the Belgian embassy in Tbilisi before travelling. Once in Belgium, register at your local commune within 8 days.',
 'ქართველი მოქალაქეები შენგენის ზონაში ვიზის გარეშე შედიან — 90 დღით ნებისმიერ 180-დღიან პერიოდში. უფრო ხანგრძლივი ყოფნისთვის ან სამუშაოდ საჭიროა გრძელვადიანი D ვიზა, რომელიც გამგზავრებამდე ბელგიის საელჩოში (თბილისში) უნდა აიღოთ. ბელგიაში ჩასვლის შემდეგ 8 დღის ვადაში დარეგისტრირდით კომუნაში.'),

('arrival', 2,
 'How do I register at my commune?',
 'როგორ დავრეგისტრირდე კომუნაში?',
 'Within 8 days of arrival, go to your commune (gemeentehuis / maison communale) with your passport, rental contract or host declaration, and passport photos. They issue an Annex 3 temporary certificate. After a police home visit confirms your address, you receive your eID residence card.',
 'ჩასვლიდან 8 დღის ვადაში მიდით კომუნაში (gemeentehuis / maison communale) პასპორტით, ქირავნობის ხელშეკრულებით ან მასპინძლის დეკლარაციით და ფოტოებით. მიიღებთ დროებით ცნობას (Annex 3). პოლიციის მიერ მისამართის შემოწმების შემდეგ გადმოგეცემათ eID ბარათი.'),

('arrival', 3,
 'What happens after registration — the police visit and eID?',
 'რა ხდება რეგისტრაციის შემდეგ — პოლიციის ვიზიტი და eID?',
 'A neighbourhood police officer visits your registered address to confirm you actually live there — be reachable in the first weeks, or leave a note with your phone number on the door. After confirmation, the commune invites you to collect your eID card. You set PIN and PUK codes — keep them safe, many services need them.',
 'უბნის პოლიციელი მოვა თქვენს მისამართზე იმის დასადასტურებლად, რომ ნამდვილად იქ ცხოვრობთ — პირველ კვირებში იყავით ხელმისაწვდომი, ან კარზე დატოვეთ ფურცელი თქვენი ნომრით. დადასტურების შემდეგ კომუნა გამოგიძახებთ eID ბარათის ასაღებად. დაგჭირდებათ PIN და PUK კოდების დაყენება — შეინახეთ, ბევრ სერვისს სჭირდება.'),

('arrival', 4,
 'How do I open a bank account?',
 'როგორ გავხსნა საბანკო ანგარიში?',
 'Online banks (Wise, Revolut, N26) accept just a passport — good for the first weeks. Once you have your eID and registered address, switch to a Belgian bank (KBC, ING, BNP Paribas Fortis, Belfius) — a Belgian IBAN makes salary, rent and administration much easier.',
 'ონლაინ ბანკები (Wise, Revolut, N26) მხოლოდ პასპორტს ითხოვენ — კარგია პირველი კვირებისთვის. eID-ისა და რეგისტრირებული მისამართის მიღების შემდეგ გახსენით ანგარიში ბელგიურ ბანკში (KBC, ING, BNP Paribas Fortis, Belfius) — ბელგიური IBAN ბევრად ამარტივებს ხელფასს, ქირასა და ადმინისტრაციას.'),

('arrival', 5,
 'How do I get a Belgian phone number?',
 'როგორ ავიღო ბელგიური ნომერი?',
 'Buy a prepaid SIM at any supermarket or phone shop — cheapest operators include Mobile Vikings, hey!, and Scarlet. You need ID to activate it (EU rule). A Belgian number is required for many services, including banking apps and delivery.',
 'იყიდეთ წინასწარ გადახდილი SIM ბარათი ნებისმიერ სუპერმარკეტში — იაფი ოპერატორებია Mobile Vikings, hey! და Scarlet. გასააქტიურებლად პირადობის დოკუმენტი დაგჭირდებათ (ევროკავშირის წესია). ბელგიური ნომერი ბევრ სერვისს სჭირდება, მათ შორის საბანკო აპებს.'),

-- ═══ HOUSING ═══
('housing', 1,
 'How does renting work in Belgium?',
 'როგორ მუშაობს ბინის ქირაობა ბელგიაში?',
 'Standard leases are 9 years (you can leave earlier with 3 months notice, sometimes with a small penalty in the first 3 years) or short-term (max 3 years). The contract must be written and registered. Rent is usually paid monthly by bank transfer; an inventory of the flat''s condition (état des lieux / plaatsbeschrijving) protects your deposit.',
 'სტანდარტული ხელშეკრულება 9-წლიანია (შეგიძლიათ ადრე წახვიდეთ 3-თვიანი გაფრთხილებით, პირველ 3 წელს ზოგჯერ მცირე ჯარიმით) ან მოკლევადიანი (მაქს. 3 წელი). ხელშეკრულება წერილობითი და რეგისტრირებული უნდა იყოს. ქირა იხდება ბანკის გადარიცხვით; ბინის მდგომარეობის აქტი (état des lieux / plaatsbeschrijving) იცავს თქვენს დეპოზიტს.'),

('housing', 2,
 'What is the blocked rental deposit?',
 'რა არის დაბლოკილი სადეპოზიტო ანგარიში?',
 'The deposit (usually 2–3 months rent) goes into a blocked bank account in YOUR name (huurwaarborg / garantie locative) — the landlord cannot touch it without your signature. Never hand over a cash deposit: it''s the #1 scam against newcomers. Any Belgian bank opens this account for free.',
 'დეპოზიტი (ჩვეულებრივ 2–3 თვის ქირა) იდება დაბლოკილ საბანკო ანგარიშზე თქვენს სახელზე (huurwaarborg / garantie locative) — მესაკუთრე მას თქვენი ხელმოწერის გარეშე ვერ შეეხება. არასოდეს გადასცეთ დეპოზიტი ნაღდი ფულით — ეს ახალჩამოსულთა წინააღმდეგ #1 თაღლითობაა. ამ ანგარიშს ნებისმიერი ბელგიური ბანკი უფასოდ ხსნის.'),

('housing', 3,
 'What should I check before signing a rental contract?',
 'რა უნდა შევამოწმო ქირავნობის ხელშეკრულების ხელმოწერამდე?',
 'View the flat in person; check the EPC energy score (bad scores mean huge heating bills); confirm what''s included in charges (water, heating, syndic); do a detailed move-in inventory with photos; and never sign a contract you can''t read — a sworn translator costs €30–80 and can save you thousands.',
 'ნახეთ ბინა პირადად; შეამოწმეთ ენერგოეფექტურობის (EPC) მაჩვენებელი (ცუდი ქულა უზარმაზარ გათბობის ხარჯს ნიშნავს); დააზუსტეთ, რა შედის კომუნალურ გადასახადებში; შესვლისას გადაიღეთ დეტალური ფოტოები; და არასოდეს მოაწეროთ ხელი ხელშეკრულებას, რომლის ენაც არ გესმით — ნაფიცი თარჯიმანი €30–80 ღირს და ათასობით ევროს დაზოგვა შეუძლია.'),

('housing', 4,
 'Where do I search for apartments?',
 'სად ვეძებო ბინა?',
 'Immoweb.be and Zimmo.be are the main portals; Facebook groups have private listings but also the most scams — read our <a href="scams.html">scam warnings</a> before paying anything. Also check our <a href="housing.html">housing board</a>, where Georgians post rooms and flats.',
 'მთავარი პორტალებია Immoweb.be და Zimmo.be; Facebook ჯგუფებში კერძო განცხადებებია, მაგრამ ყველაზე მეტი თაღლითობაც იქაა — სანამ რამეს გადაიხდით, წაიკითხეთ ჩვენი <a href="scams.html">გაფრთხილებები</a>. ასევე ნახეთ ჩვენი <a href="housing.html">საცხოვრებლის გვერდი</a>, სადაც ქართველები დებენ განცხადებებს.'),

-- ═══ WORK ═══
('work', 1,
 'Can I work in Belgium with a Georgian passport?',
 'შემიძლია თუ არა მუშაობა ქართული პასპორტით?',
 'Non-EU citizens need a work authorisation. Belgium uses the "single permit" (permis unique / gecombineerde vergunning): your employer applies on your behalf for a combined work + residence permit. Working without a permit ("in the black") leaves you with zero protection — see our <a href="scams.html">scam warnings</a>.',
 'არა-ევროკავშირის მოქალაქეებს მუშაობის ნებართვა სჭირდებათ. ბელგიაში მოქმედებს „ერთიანი ნებართვა" (permis unique / gecombineerde vergunning): დამსაქმებელი თქვენ მაგივრად აკეთებს განაცხადს კომბინირებულ სამუშაო+ბინადრობის ნებართვაზე. ნებართვის გარეშე („შავად") მუშაობა ნულოვან დაცვას ნიშნავს — იხილეთ ჩვენი <a href="scams.html">გაფრთხილებები</a>.'),

('work', 2,
 'How long does the single permit take?',
 'რამდენ ხანს გრძელდება ერთიანი ნებართვის მიღება?',
 'Typically 2–4 months from the employer''s application. Highly-qualified workers, researchers and shortage occupations have faster or easier tracks. The employer starts the process — you cannot apply for it yourself as an employee. [TODO: verify current processing times]',
 'ჩვეულებრივ 2–4 თვე დამსაქმებლის განაცხადიდან. მაღალკვალიფიციურ სპეციალისტებს, მკვლევრებსა და დეფიციტურ პროფესიებს უფრო სწრაფი გზები აქვთ. პროცესს დამსაქმებელი იწყებს — თანამშრომელი თავად ვერ შეიტანს განაცხადს. [TODO: გადაამოწმეთ მიმდინარე ვადები]'),

('work', 3,
 'How do I get my Georgian diploma recognized?',
 'როგორ ვაღიარებინო ქართული დიპლომი?',
 'Apply to NARIC (naricvlaanderen.be in Flanders, equivalences.cfwb.be in Wallonia/Brussels). Required for regulated professions — medicine, law, engineering, teaching. The process takes 2–4 months and needs certified translations of your diploma, so start early.',
 'მიმართეთ NARIC-ს (naricvlaanderen.be ფლანდრიაში, equivalences.cfwb.be ვალონიასა და ბრიუსელში). ეს სავალდებულოა რეგულირებადი პროფესიებისთვის — მედიცინა, სამართალი, ინჟინერია, პედაგოგიკა. პროცესი 2–4 თვე გრძელდება და დიპლომის დამოწმებული თარგმანი სჭირდება — დაიწყეთ ადრე.'),

('work', 4,
 'What are VDAB, Actiris and Le Forem?',
 'რა არის VDAB, Actiris და Le Forem?',
 'The free regional employment services: VDAB (Flanders), Actiris (Brussels), Le Forem (Wallonia). They offer job matching, free coaching, CV help and heavily subsidised training — including language courses aimed at getting you hired. Register as soon as you''re allowed to work.',
 'უფასო რეგიონული დასაქმების სამსახურები: VDAB (ფლანდრია), Actiris (ბრიუსელი), Le Forem (ვალონია). გთავაზობენ ვაკანსიების შერჩევას, უფასო კონსულტაციას, CV-ში დახმარებას და სუბსიდირებულ ტრენინგებს — მათ შორის ენის კურსებს დასაქმების მიზნით. დარეგისტრირდით, როგორც კი მუშაობის უფლება გექნებათ.'),

('work', 5,
 'What are my basic rights as a worker?',
 'რა არის ჩემი ძირითადი უფლებები დასაქმებულად?',
 'A written contract before you start, a monthly payslip, at least the sectoral minimum wage, paid holidays, and accident insurance. Cash-only work with no contract means none of these exist for you. If an employer refuses a contract, that''s a red flag — see scam pattern #5 on our <a href="scams.html">scams page</a>.',
 'წერილობითი ხელშეკრულება მუშაობის დაწყებამდე, ყოველთვიური ხელფასის ფურცელი (payslip), მინიმუმ დარგობრივი მინიმალური ხელფასი, ანაზღაურებადი შვებულება და უბედური შემთხვევის დაზღვევა. ხელშეკრულების გარეშე ნაღდი ანგარიშსწორება ნიშნავს, რომ არცერთი ეს უფლება არ გაქვთ. თუ დამსაქმებელი ხელშეკრულებაზე უარს ამბობს — ეს საგანგაშო ნიშანია, იხილეთ <a href="scams.html">თაღლითობის გვერდზე</a> სქემა #5.'),

-- ═══ HEALTHCARE ═══
('healthcare', 1,
 'How does Belgian healthcare work?',
 'როგორ მუშაობს ბელგიის ჯანდაცვა?',
 'Health coverage is mandatory. Join a mutuelle / ziekenfonds (sickness fund) — popular ones are Mutualité Chrétienne (CM), Solidaris and Partenamut. You pay roughly €8–15/month; they reimburse most of your medical costs. You need your national registration number to join.',
 'ჯანმრთელობის დაზღვევა სავალდებულოა. გაწევრიანდით mutuelle / ziekenfonds-ში (ავადმყოფობის ფონდი) — პოპულარულია Mutualité Chrétienne (CM), Solidaris და Partenamut. იხდით დაახლოებით €8–15 თვეში; ისინი გინაზღაურებენ სამედიცინო ხარჯების უმეტესობას. გასაწევრიანებლად ეროვნული ნომერი გჭირდებათ.'),

('healthcare', 2,
 'How do I see a doctor or specialist?',
 'როგორ მივიდე ექიმთან ან სპეციალისტთან?',
 'Belgium is GP-first: pick a huisarts / médecin généraliste near you and register (a "GMD/DMG file" gets you higher reimbursements). The GP refers you to specialists. A GP visit costs ~€27–35 upfront; the mutuelle reimburses most of it. Georgian-speaking doctors are listed in our <a href="services.html">services directory</a>.',
 'ბელგიაში ჯერ ოჯახის ექიმთან მიდიან: აირჩიეთ huisarts / médecin généraliste და დარეგისტრირდით (GMD/DMG ფაილი მეტ ანაზღაურებას გაძლევთ). სპეციალისტთან ოჯახის ექიმი გიწერთ მიმართვას. ვიზიტი ~€27–35 ღირს ადგილზე; უმეტესობას mutuelle გინაზღაურებთ. ქართულენოვანი ექიმები ნახეთ ჩვენს <a href="services.html">კატალოგში</a>.'),

('healthcare', 3,
 'What if I need care before my papers are ready?',
 'რა ვქნა, თუ ექიმი მჭირდება, სანამ საბუთები მზად არ არის?',
 'Emergencies are always treated — call 112 or go to the ER (spoed / urgences). Without insurance you''ll be billed, but hospitals have social services that can help arrange payment. People without legal residence can apply for "urgent medical aid" through the CPAS/OCMW. [TODO: verify details]',
 'გადაუდებელ შემთხვევაში ყოველთვის გიმკურნალებენ — დარეკეთ 112-ზე ან მიდით სასწრაფო მიღებაში (spoed / urgences). დაზღვევის გარეშე ანგარიშს გამოგიწერენ, მაგრამ საავადმყოფოებს აქვთ სოციალური სამსახური, რომელიც გადახდის მოგვარებაში დაგეხმარებათ. ლეგალური ბინადრობის არმქონე პირებს შეუძლიათ „გადაუდებელი სამედიცინო დახმარება" მოითხოვონ CPAS/OCMW-ს მეშვეობით. [TODO: გადაამოწმეთ დეტალები]'),

('healthcare', 4,
 'What are the emergency numbers?',
 'რა არის გადაუდებელი დახმარების ნომრები?',
 '112 — all emergencies (ambulance, fire), works in English. 101 — police. 1733 — after-hours GP on duty. Card Stop (078 170 170) — stolen bank card or eID. Pharmacies on night duty: pharmacie.be / apotheek.be.',
 '112 — ყველა გადაუდებელი შემთხვევა (სასწრაფო, ხანძარი), ინგლისურადაც მუშაობს. 101 — პოლიცია. 1733 — მორიგე ოჯახის ექიმი არასამუშაო საათებში. Card Stop (078 170 170) — მოპარული ბარათი ან eID. მორიგე აფთიაქები: pharmacie.be / apotheek.be.'),

-- ═══ SCHOOLS & KIDS ═══
('schools', 1,
 'How do I enrol my child in school?',
 'როგორ ჩავრიცხო ბავშვი სკოლაში?',
 'School is compulsory from age 5. Brussels French-side uses a central enrolment system; Flanders uses "aanmelden" online registration — popular schools fill up fast, so apply early. Kids who don''t speak the language get a bridging year: OKAN (Dutch) or DASPA (French).',
 'სკოლა სავალდებულოა 5 წლიდან. ბრიუსელის ფრანგულ მხარეს ცენტრალიზებული ჩარიცხვის სისტემაა; ფლანდრიაში — ონლაინ რეგისტრაცია „aanmelden". პოპულარული სკოლები სწრაფად ივსება, ამიტომ ადრე შეიტანეთ განაცხადი. ენის არმცოდნე ბავშვებისთვის არის გარდამავალი კლასი: OKAN (ჰოლანდიური) ან DASPA (ფრანგული).'),

('schools', 2,
 'Is school free? What does it cost?',
 'უფასოა თუ არა სკოლა?',
 'Public education is free, but you pay for supplies, trips and lunches. Primary schools have a legal cap on what they may charge parents (Flanders). Low-income families can get a school allowance — ask the school''s social service or your commune.',
 'საჯარო განათლება უფასოა, მაგრამ იხდით ნივთებში, ექსკურსიებსა და კვებაში. დაწყებით სკოლებში მშობლისგან მოთხოვნილ თანხას კანონი ზღუდავს (ფლანდრია). დაბალშემოსავლიან ოჯახებს შეუძლიათ სასკოლო შემწეობა მიიღონ — ჰკითხეთ სკოლის სოციალურ სამსახურს ან კომუნას.'),

('schools', 3,
 'How does childcare (crèche) work?',
 'როგორ მუშაობს ბაგა-ბაღი (crèche)?',
 'Childcare for 0–3 year olds is heavily subsidised but has long waiting lists — register during pregnancy if you can. Cost is income-based (Flanders: via Kind en Gezin / Opgroeien; Brussels/Wallonia: ONE). From age 2.5, kleuterschool / école maternelle is free.',
 'ბაგა-ბაღი 0–3 წლის ბავშვებისთვის სუბსიდირებულია, მაგრამ დიდი რიგებია — თუ შეგიძლიათ, ორსულობისასვე დარეგისტრირდით. ფასი შემოსავალზეა დამოკიდებული (ფლანდრია: Kind en Gezin / Opgroeien; ბრიუსელი/ვალონია: ONE). 2,5 წლიდან საბავშვო ბაღი (kleuterschool / école maternelle) უფასოა.'),

-- ═══ MONEY & TAXES ═══
('money', 1,
 'How do taxes work for employees?',
 'როგორ მუშაობს გადასახადები დასაქმებულებისთვის?',
 'Income tax is withheld from your salary automatically. Once a year (June–July) you file a tax return — mostly pre-filled via Tax-on-web with your eID. Your first year you may get a paper form. Keep your payslips; many expenses (childcare, service vouchers) are deductible.',
 'საშემოსავლო გადასახადი ხელფასიდან ავტომატურად იქვითება. წელიწადში ერთხელ (ივნისი–ივლისი) ავსებთ დეკლარაციას — ძირითადად წინასწარ შევსებულია Tax-on-web-ზე eID-ით. პირველ წელს შესაძლოა ქაღალდის ფორმა მოგივიდეთ. შეინახეთ ხელფასის ფურცლები; ბევრი ხარჯი (ბაგა-ბაღი, სერვის-ვაუჩერები) გამოიქვითება.'),

('money', 2,
 'What is child benefit and how do I get it?',
 'რა არის ბავშვის შემწეობა და როგორ მივიღო?',
 'Every legally-resident child gets a monthly allowance: Groeipakket (Flanders), or allocations familiales (Brussels/Wallonia) — roughly €170–280/month per child depending on region and age. Apply through a payout fund (e.g. Infino, KidsLife, Parentia) once you''re registered. [TODO: verify current amounts]',
 'ლეგალურად მცხოვრები ყველა ბავშვი იღებს ყოველთვიურ შემწეობას: Groeipakket (ფლანდრია) ან allocations familiales (ბრიუსელი/ვალონია) — დაახლოებით €170–280 თვეში ბავშვზე, რეგიონისა და ასაკის მიხედვით. განაცხადი შეიტანეთ გამცემ ფონდში (მაგ. Infino, KidsLife, Parentia) რეგისტრაციის შემდეგ. [TODO: გადაამოწმეთ მიმდინარე თანხები]'),

('money', 3,
 'What is the CPAS/OCMW and who can get help?',
 'რა არის CPAS/OCMW და ვის შეუძლია დახმარების მიღება?',
 'Every commune has a public social welfare centre (CPAS / OCMW). It can help with a minimum income, urgent medical aid, rent guarantees, food support and social guidance. Help depends on your residence status — asking costs nothing and is confidential.',
 'ყველა კომუნას აქვს სოციალური დახმარების ცენტრი (CPAS / OCMW). მას შეუძლია დაგეხმაროთ მინიმალური შემოსავლით, გადაუდებელი სამედიცინო დახმარებით, ქირის გარანტიით, საკვებითა და სოციალური კონსულტაციით. დახმარება ბინადრობის სტატუსზეა დამოკიდებული — კითხვა არაფერი ღირს და კონფიდენციალურია.'),

('money', 4,
 'How do I send money to Georgia?',
 'როგორ გავგზავნო ფული საქართველოში?',
 'Bank transfers to Georgian accounts work but are slow and have fees. Wise, Revolut and similar services are usually the cheapest for GEL transfers; Western Union / MoneyGram work for cash pickup. Compare the real exchange rate, not just the fee. Never use informal "hawala-style" couriers — no protection if it disappears.',
 'საბანკო გადარიცხვა ქართულ ანგარიშზე მუშაობს, მაგრამ ნელია და საკომისიო აქვს. Wise, Revolut და მსგავსი სერვისები ლარში გადარიცხვისთვის, როგორც წესი, ყველაზე იაფია; Western Union / MoneyGram — ნაღდი ფულის ასაღებად. შეადარეთ რეალური კურსი და არა მხოლოდ საკომისიო. არასოდეს გამოიყენოთ არაფორმალური „კურიერები" — თუ ფული გაქრა, ვერაფერს დაიბრუნებთ.'),

-- ═══ DRIVING & TRANSPORT ═══
('driving', 1,
 'Can I exchange my Georgian driving licence?',
 'შემიძლია თუ არა ქართული მართვის მოწმობის გადაცვლა?',
 'Yes — Georgia has a licence exchange agreement with Belgium. Take your Georgian licence plus a sworn translation to your commune; you receive a Belgian licence without re-taking exams. Do this soon after registering — deadlines apply. [TODO: verify the exact deadline — sources differ between 6 months and 2 years]',
 'დიახ — საქართველოსა და ბელგიას შორის მოწმობის გადაცვლის შეთანხმება მოქმედებს. მიიტანეთ ქართული მოწმობა და ნაფიცი თარჯიმნის თარგმანი კომუნაში; ბელგიურ მოწმობას გამოცდების გარეშე მიიღებთ. გააკეთეთ ეს რეგისტრაციისთანავე — ვადები მოქმედებს. [TODO: გადაამოწმეთ ზუსტი ვადა — წყაროები 6 თვესა და 2 წელს შორის განსხვავდება]'),

('driving', 2,
 'How does public transport work?',
 'როგორ მუშაობს საზოგადოებრივი ტრანსპორტი?',
 'One MOBIB card works across operators: STIB/MIVB (Brussels), De Lijn (Flanders), TEC (Wallonia) and SNCB/NMBS trains. Buy and top up online or at stations. Under-25s and over-65s get big discounts; yearly passes are much cheaper than monthly tickets.',
 'ერთი MOBIB ბარათი ყველა ოპერატორთან მუშაობს: STIB/MIVB (ბრიუსელი), De Lijn (ფლანდრია), TEC (ვალონია) და SNCB/NMBS მატარებლები. შეავსეთ ონლაინ ან სადგურებში. 25 წლამდე და 65+ ასაკის მგზავრებს დიდი ფასდაკლება აქვთ; წლიური აბონემენტი გაცილებით იაფია.'),

('driving', 3,
 'What do I need to drive a car in Belgium?',
 'რა მჭირდება ბელგიაში მანქანის სატარებლად?',
 'A valid licence, civil liability insurance (mandatory — no insurance means the car cannot be on the road), registration of the car in Belgium, annual technical inspection (contrôle technique / keuring) for cars over 4 years old, and road tax. Insurance for new arrivals is expensive — compare brokers.',
 'მოქმედი მოწმობა, სამოქალაქო პასუხისმგებლობის დაზღვევა (სავალდებულოა — დაზღვევის გარეშე მანქანა გზაზე ვერ გავა), მანქანის ბელგიაში რეგისტრაცია, ყოველწლიური ტექდათვალიერება (contrôle technique / keuring) 4 წელზე ძველი მანქანებისთვის და საგზაო გადასახადი. ახალჩამოსულებისთვის დაზღვევა ძვირია — შეადარეთ ბროკერები.'),

-- ═══ LANGUAGE LEARNING ═══
('language', 1,
 'Where can I learn Dutch or French cheaply?',
 'სად ვისწავლო ჰოლანდიური ან ფრანგული იაფად?',
 'Het Huis van het Nederlands (Dutch, Flanders/Brussels) and Lire et Écrire or your commune''s courses (French, Wallonia/Brussels) are heavily subsidised — often €30–100 per semester. CVO adult-education centres offer evening classes. VDAB/Actiris language courses are free if you''re job-seeking.',
 'Het Huis van het Nederlands (ჰოლანდიური, ფლანდრია/ბრიუსელი) და Lire et Écrire ან თქვენი კომუნის კურსები (ფრანგული, ვალონია/ბრიუსელი) სუბსიდირებულია — ხშირად €30–100 სემესტრში. CVO ზრდასრულთა ცენტრები საღამოს კურსებს სთავაზობენ. VDAB/Actiris-ის ენის კურსები უფასოა, თუ სამუშაოს ეძებთ.'),

('language', 2,
 'Do I need the language for long-term residence?',
 'მჭირდება თუ არა ენა გრძელვადიანი ბინადრობისთვის?',
 'Flanders requires newcomers to follow an integration course (inburgering) including language level A2; Wallonia and Brussels have their own integration paths. Language proof also matters for citizenship and some social benefits. [TODO: verify current requirements per region]',
 'ფლანდრია ახალჩამოსულებს ავალდებულებს ინტეგრაციის კურსს (inburgering), მათ შორის ენის A2 დონეს; ვალონიასა და ბრიუსელს საკუთარი ინტეგრაციის გზები აქვთ. ენის ცოდნის დადასტურება ასევე მნიშვნელოვანია მოქალაქეობისა და ზოგიერთი შემწეობისთვის. [TODO: გადაამოწმეთ მიმდინარე მოთხოვნები რეგიონების მიხედვით]'),

('language', 3,
 'Dutch or French — which should I learn?',
 'ჰოლანდიური თუ ფრანგული — რომელი ვისწავლო?',
 'Learn the language of your region: Dutch in Flanders, French in Wallonia. In Brussels both work, but French dominates daily life while Dutch often pays better on the job market. Whichever you pick, even A2 level dramatically changes how institutions treat you.',
 'ისწავლეთ თქვენი რეგიონის ენა: ჰოლანდიური ფლანდრიაში, ფრანგული ვალონიაში. ბრიუსელში ორივე მუშაობს — ყოველდღიურობაში ფრანგული ჭარბობს, სამსახურის ბაზარზე კი ჰოლანდიური ხშირად უკეთ ფასდება. რომელიც არ უნდა აირჩიოთ, A2 დონეც კი მკვეთრად ცვლის დამოკიდებულებას თქვენ მიმართ.');

end if;
end $$;
