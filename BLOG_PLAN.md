# Blog Plan — geosin.be

Decided: Claude drafts → you approve → publish **from the admin panel**.
Posts live in Supabase; a Cloudflare Worker server-renders /blog pages as full
HTML, so SEO stays as strong as static pages.

---

## 1. The idea

A bilingual (KA/EN) blog of **short, useful articles and news** for Georgians in Belgium. Two content types:

**News** (timely, short, 200–400 words)
- Belgian rule changes that affect Georgians: immigration, work permits, driving licenses, taxes
- Deadlines: tax filing, school registration, energy premiums
- Georgia↔Belgium news: flights, consulate announcements, visa rules

**Evergreen articles** (SEO workhorses, 500–800 words)
- "How to exchange a Georgian driving license in Belgium"
- "Sending money Georgia ↔ Belgium: cheapest options in 2026"
- "Recognizing your Georgian diploma in Belgium"
- "Where to buy Georgian products in Brussels/Antwerp/Ghent"
- "Georgian-speaking doctors and lawyers — how to find them" (links to your Services page!)

**Why this wins traffic:** almost nobody writes this content in Georgian. Georgian-language search queries about Belgium have near-zero competition — a decent article can rank #1 on Google within weeks. Every article should link to your existing pages (services, guides, forum) so search visitors become community members.

**Cadence:** 1 post/week is enough. Consistency beats volume.

---

## 2. Architecture (admin-managed)

Why not static files: the admin panel runs in a browser and can't write files
to the git repo. So posts live in **Supabase** (like guides/places), and SEO is
saved by a **Cloudflare Worker** that renders /blog pages as complete HTML on
the server — Google sees the full article, same as a static page.

```
Supabase table  blog_posts   ← slug, status (draft/published), date, tags,
                               title/summary/body in KA+EN, image URL
Supabase storage blog-images ← hero photos, uploaded from admin
admin.html      Blog tab     ← create, edit, preview, publish, unpublish
Cloudflare Worker            ← serves /blog (index) and /blog/<slug>
                               as full server-rendered HTML + dynamic sitemap
```

Publish flow: write/paste post in admin → upload photo → click Publish → live
in seconds. No git, no redeploy.

**Photos:** every post gets one hero image, uploaded via the admin form
(stock from Pexels/Unsplash or your own — real photos of Georgian life in
Belgium beat stock). Compressed to .webp ~1200px. Used as post hero, index
thumbnail, and og:image so Facebook/WhatsApp shares show the picture.

Each post page:
- Same nav + footer as every other page (copy-paste, like the rest of the site)
- Page header follows the services.html convention (eyebrow + title + description, all lang-split KA/EN)
- Both languages in one file, toggled by the existing language switcher
- Proper `<title>`, meta description, og: tags per post → this is what Google ranks
- "Related links" box at the bottom pointing to relevant site pages

Site-wide changes:
- Add "Blog" (KA: ბლოგი) to the nav on all pages
- Add each new post to `sitemap.xml`
- Optional later: RSS feed, "latest posts" strip on the homepage

---

## 3. Automation with Claude — how it actually works

Claude Code can't wake up on its own on a schedule. But you can get 95% of the automation with a **one-command weekly workflow**:

1. You open Claude Code once a week and type: **`/blog-post`** (a custom command we'll create)
2. Claude searches the web for fresh news relevant to Georgians in Belgium + checks which evergreen topics aren't written yet
3. It proposes 3–5 topics with a one-line pitch each
4. You pick one (or say "your choice")
5. Claude writes the full bilingual post and saves it to Supabase as a **draft**
6. You open admin.html, read it, add/adjust the photo, click **Publish** → live in seconds

Total effort for you: ~10 minutes a week, mostly reading the draft.

**Optional extra:** a Cowork scheduled task (here, in this app) that runs every Monday, searches the news, and messages you 3 topic ideas — so you arrive at your weekly session with topics already scouted. Say the word and I'll set it up.

---

## 4. Prompts for Claude Code

### Prompt A — build the admin-managed blog (run once)

```
Add a blog to this site, fully managed from the existing admin panel
(admin.html). I am a beginner — explain any manual steps (like running SQL
in Supabase) one at a time.

DATABASE (Supabase)
- Write SETUP_BLOG.sql for me to run in the Supabase SQL editor:
  blog_posts table with id, slug (unique), status ('draft'/'published'),
  published_at, tags text[], title_ka, title_en, summary_ka, summary_en,
  body_ka, body_en (markdown), image_url, created_at, updated_at.
  RLS: anyone can read published posts; only admins can read drafts and
  write — reuse the exact admin-check pattern from SETUP_ADMIN.sql and the
  other SETUP_*.sql files.
- Storage bucket "blog-images": public read, admin-only write.

ADMIN PANEL
- Add a "Blog" tab to admin.html following the existing admin UI patterns:
  * list of posts with status badge (draft/published), date, edit/delete
  * create/edit form: slug (auto-suggested from English title), tags
    (news/guide), KA and EN fields for title, summary, and body (markdown
    textareas with a live preview toggle)
  * hero image upload to blog-images (compress/resize client-side to max
    1200px webp before upload if feasible; otherwise just upload)
  * Publish / Unpublish button; preview link that opens /blog/<slug>
    (drafts viewable by admin only)

PUBLIC PAGES (Cloudflare Worker — SEO is the top priority)
- Extend the Worker config in wrangler.jsonc so these routes are
  server-rendered full HTML (NOT client-side JS rendering):
  * /blog — index of published posts, newest first, cards with thumbnail,
    title, date, summary; simple tag filter (news/guide)
  * /blog/<slug> — the article: hero image, date + tags, body rendered
    from markdown (use a small dependency-free markdown renderer)
  * /blog/sitemap.xml — dynamic sitemap of published posts; reference it
    from robots.txt
- The Worker fetches from Supabase with the anon key and caches responses
  at the edge for ~5 minutes.
- Rendered pages must match the site exactly: same nav and footer as
  services.html, page header per the services.html convention (eyebrow +
  title + description, KA/EN lang-split), existing style.css, dark mode,
  and the existing language toggle working. Both languages in the same
  page, toggled like everywhere else.
- Per-post SEO: unique <title>, meta description, og:title/description/
  image/url (absolute https://geosin.be/... URLs), JSON-LD Article schema.
- Article layout: max-width ~720px, generous line-height, styled headings,
  related-links box at the bottom linking to /services.html and
  /guides.html. 404 page for unknown slugs.

SITE-WIDE
- Add "Blog" (KA: ბლოგი) to the nav on ALL existing pages.

FIRST POST
- Draft one real post directly into blog_posts as a draft: "How to exchange
  a Georgian driving license in Belgium" — bilingual KA/EN, 500–700 words
  per language. Verify current Belgian rules with web search; link official
  sources; never invent dates, prices, or legal rules. Suggest a fitting
  free stock photo (Pexels/Unsplash) for me to upload in admin.

- Show me a local preview before committing anything. Walk me through
  testing: run SQL → open admin → publish the draft → check /blog.
```

### Prompt B — create the weekly command (run once, after A)

```
Create a custom slash command /blog-post (in .claude/commands/blog-post.md)
that does the following when I run it:

1. Search the web for news from the last 2 weeks relevant to Georgians
   living in Belgium: Belgian immigration/permit/tax/admin changes, deadlines,
   Georgia-Belgium news (flights, consulate, visas). Also check blog/posts.json
   for which evergreen topics are NOT yet covered.
2. Propose 3–5 post ideas: title + one-line pitch + whether it's news or
   evergreen. Wait for me to pick.
3. Write the chosen post: bilingual KA/EN markdown (body_ka + body_en),
   title, summary, tags. News posts 200–400 words per language, evergreen
   500–800. Verify all facts with web search — never invent dates, prices,
   or legal rules; link official sources.
4. Insert it into the Supabase blog_posts table as a DRAFT (status='draft'),
   using the service-role key from the local .env file (gitignored).
   Never publish directly.
5. Suggest a fitting free stock photo (Pexels/Unsplash) with a direct link
   so I can upload it in the admin panel.
6. Tell me the draft is ready — I review and hit Publish in admin.html.

Georgian must be natural, not machine-translated-sounding. Tone: warm,
practical, community-to-community. Never publish without my approval.
```

---

## 5. Order of operations

1. Run Prompt A in Claude Code → review the blog + first post → publish
2. Run Prompt B → `/blog-post` command exists
3. Every week: run `/blog-post`, pick a topic → review + Publish in admin.html
4. (Optional) Ask me to set up the Monday topic-scout scheduled task
