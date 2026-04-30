# NEXT_STEPS.md — handoff after autonomous sprint

This document summarizes the work I (Claude) did while you were away on 2026-04-30, what's now in the project, and the exact actions you need to take when you return.

---

## TL;DR — what to do when you're back

1. **Run one SQL command** in your Supabase project (see step 1 below). This is required for the new public listings page to actually show services.
2. **Review the diff** in VS Code's Source Control panel. Lots of files changed — eyeball them.
3. **One commit + push.** Suggested message: `Phase 2 polish: more pages, more FAQs, listings, search, SEO`.
4. **Verify live.** Visit `geosin.be`, click through every page, test search, test the language toggle, submit a test service entry, see it appear in the listings after you approve it in Supabase.

Everything below is the detail behind those four steps.

---

## Step 1 — Run the SQL setup (mandatory)

Open `SETUP.sql` in your project folder. It contains a single SQL command that adds a SELECT policy to your `services` table, allowing the new public listings page to read approved services without exposing pending ones.

To run it:
- Supabase dashboard → SQL Editor → New query
- Paste the contents of `SETUP.sql`
- Click **Run**

You should see "Success. No rows returned." After this, the public listings will work. Without it, the listings section on `services.html` will show an empty state forever even when there are approved services in the database.

---

## Step 2 — Review the changes

Open VS Code → Source Control panel. You'll see a long list of changed files. Here's a map.

### New files (created from scratch)

- `about.html` — about page with mission, community resources, contact, open-source link
- `404.html` — custom not-found page (Cloudflare Pages auto-uses this for missing URLs)
- `forum.html` — coming-soon placeholder for the future discussion forum
- `favicon.svg` — small "g" mark in your brand colors that shows in browser tabs
- `sitemap.xml` — tells search engines about your pages
- `robots.txt` — allows all crawlers, points them at the sitemap
- `SETUP.sql` — the one-time SQL you need to run (see step 1)
- `DESIGN_BRIEF.md` — long-form design brief for when you commission a redesign
- `DESIGN_BRIEF_SHORT.md` — short paste-ready prompt for design tools
- `NEXT_STEPS.md` — this file

### Modified files

**`index.html`** (FAQ page) — significant changes:
- Added meta description, Open Graph tags, Twitter card, favicon link (improves how it looks when shared on social and in search results)
- Updated nav: added **About** link
- Added a search input above the FAQ list — type to filter
- Added 5 new FAQs in both languages: work permit, public transport, free language classes, schools for kids, driving license conversion
- JavaScript was reworked so the search and language toggle work together correctly

**`services.html`** — restructured into a two-section page:
- Top half: **Find a service** — pulls approved entries from Supabase, renders them as cards, has filter-by-search and filter-by-category
- Bottom half: **Offer a service?** — the registration form that was already there
- Same nav now also has About
- Same meta tags and favicon as index

**`style.css`** — added new component styles:
- Prose styles for the about/404 pages
- Callout box for the coming-soon forum page
- CTA button (used in forum.html)
- Section divider (used between listings and form on services.html)
- FAQ search input
- Service-listing filter bar + service cards + empty state + loading state
- Updated mobile breakpoints to handle the new components

---

## Step 3 — Commit and push

In VS Code Source Control:
1. Stage all changes (click `+` next to "Changes")
2. Commit message: `Phase 2 polish: more pages, more FAQs, listings, search, SEO`
3. `Cmd+Enter` to commit
4. Click **Sync Changes** to push to GitHub
5. Cloudflare Pages will auto-deploy within ~30 seconds

---

## Step 4 — Verify live

Open `https://geosin.be` in incognito (or hard-refresh in your normal browser) and check:

- [ ] Browser tab shows the new favicon (a black square with red "g")
- [ ] Top nav shows: brand · FAQ · Services · About
- [ ] FAQ search filters as you type. Try "rent" — should hit the rental and deposit FAQs.
- [ ] Language toggle still works. Search persists across language switches.
- [ ] All 15 FAQs are present in EN, all 15 in KA.
- [ ] Click **Services** → page loads, you see "Loading services…" then either an empty state or your test service (after step 1 SQL).
- [ ] Submit a test entry through the form. It should land in your Supabase `services` table (visible in the dashboard).
- [ ] In Supabase Table Editor, manually flip `approved` from `false` to `true` for one test row. Refresh `services.html` — that row should now appear in the public listings.
- [ ] Click **About** → page loads with proper styling.
- [ ] Click **Forum** (link in About page footer) → coming-soon page.
- [ ] Visit `geosin.be/some-fake-page` → 404 page renders cleanly.

---

## Known limitations

- **The Supabase publishable key is in your public source code.** That's by design and safe — RLS controls what it can do. Don't mistake it for a secret.
- **No spam protection on the form yet.** Anyone can spam-submit. The `approved=false` default protects the listings, but your moderation queue will fill up if someone targets you. Consider adding a honeypot field, hCaptcha, or a Supabase Edge Function rate limiter when this becomes a problem.
- **No admin UI.** You moderate by going to the Supabase Table Editor and flipping `approved`. Fine for low volume; build a real admin page when it's not.
- **Email exposure for service providers.** Approved listings publicly show the email a provider submitted. They opted in by submitting, but you might want to mention this on the form.
- **My Georgian translations are functional but not polished.** Native-speaker review still pending — you mentioned you'll go through them.
- **The site's visual design is intentionally basic.** I kept it minimal because you said you have a design coming. Use the `DESIGN_BRIEF*.md` files when you commission the redesign.

---

## Pending / nice-to-have

Things I considered but didn't do — pick what matters when you're back:

- Pagination for the services listings (only matters when you have 50+ entries)
- An RSS feed for new services
- A simple analytics tool (Plausible, Cloudflare Web Analytics — free, privacy-respecting)
- Contact form on the About page (currently just a GitHub issues link)
- KA versions of the new pages (about, 404, forum, services) — currently English only outside of the FAQ
- A "Last updated" timestamp on the FAQ
- Images / OG share image for richer social previews
- Real spam protection on the registration form (honeypot, rate-limit)

---

## On the design integration

When the design comes back from your design tool, the cleanest path is:

1. Drop the new `style.css` and any new HTML files into the project
2. Make sure the new HTML preserves the IDs and classes the JavaScript expects:
   - FAQ page: `lang-toggle button` with `data-lang`, `.lang-en`, `.lang-ka`, `.faq-item`, `#faq-search-input`, `#faq-no-results`
   - Services page: `#filter-query`, `#filter-category`, `#listings`, `#service-form`, `#success`, `#error`, plus the form fields with names matching the database columns (category, name, description, region, languages, email, phone, link)
3. If the design uses different IDs/classes, either rename them in the design or update the JavaScript to match — both work.
4. Commit + push.

---

Built by Claude during the autonomous sprint of 2026-04-30. Let me know how it goes.
