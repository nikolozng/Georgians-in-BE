# Blog Plan — geosin.be

Decided: Claude drafts → you approve → publish. Posts are static HTML pages (best SEO).

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

## 2. Architecture

```
blog.html              ← blog index: list of all posts, newest first
blog/                  ← one folder for all posts
  2026-08-driving-license.html
  2026-08-tax-deadline.html
  ...
blog/posts.json        ← small list of posts (title, date, slug, summary, tags)
                         blog.html reads this to build the list — no rebuild needed
```

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
5. Claude writes the full bilingual post, creates the HTML file, updates posts.json, blog index, and sitemap
6. You read it in the browser preview. Say "publish" → Claude commits and pushes → live on Cloudflare in ~1 minute

Total effort for you: ~10 minutes a week, mostly reading the draft.

**Optional extra:** a Cowork scheduled task (here, in this app) that runs every Monday, searches the news, and messages you 3 topic ideas — so you arrive at your weekly session with topics already scouted. Say the word and I'll set it up.

---

## 4. Prompts for Claude Code

### Prompt A — build the blog (run once)

```
Add a blog to this site. Requirements:

STRUCTURE
- Create blog.html (blog index) and a blog/ folder for individual posts.
- Create blog/posts.json listing all posts: slug, date, title_ka, title_en,
  summary_ka, summary_en, tags. blog.html loads it with JS and renders the
  post list newest-first, with a simple tag filter (news / guide).
- Individual posts are plain static HTML files in blog/ — full content in the
  HTML itself (NOT loaded from JSON) so Google indexes everything.

CONVENTIONS — follow the existing site exactly
- Copy nav and footer from services.html; add a "Blog" link (KA: ბლოგი) to
  the nav and add it to the nav of ALL existing pages.
- Page header: same pattern as services.html (eyebrow + title + description,
  all with KA/EN lang-split, using the site's existing language toggle
  mechanism).
- Use existing style.css variables/classes; add blog-specific styles in a
  <style> block like other pages do. Match dark mode.
- Every post: unique <title>, meta description, og:title/description/url,
  and JSON-LD Article schema for SEO. Add each post to sitemap.xml.

FIRST POST
- Create one real example post: "How to exchange a Georgian driving license
  in Belgium" — bilingual KA/EN, 500–700 words per language, accurate as of
  today (search the web to verify current Belgian rules). End with a related-
  links box pointing to /services.html and /guides.html.

- Post pages need a readable article layout: max-width ~720px, generous line
  height, styled headings, and a date + tag line under the title.
- Show me a preview before committing anything.
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
3. Write the chosen post following the conventions of existing posts in
   blog/ exactly: bilingual KA/EN in one file, same header/nav/footer, SEO
   meta tags, JSON-LD, related-links box. News posts 200–400 words per
   language, evergreen 500–800. Verify all facts with web search — never
   invent dates, prices, or legal rules; link official sources.
4. Update blog/posts.json and sitemap.xml.
5. Show me the post for review. Only after I say "publish", commit and push
   with message "blog: <slug>".

Georgian must be natural, not machine-translated-sounding. Tone: warm,
practical, community-to-community. Never publish without my approval.
```

---

## 5. Order of operations

1. Run Prompt A in Claude Code → review the blog + first post → publish
2. Run Prompt B → `/blog-post` command exists
3. Every week: run `/blog-post`, pick a topic, review, say "publish"
4. (Optional) Ask me to set up the Monday topic-scout scheduled task
