# Georgians in Belgium — Project Roadmap

## The vision
A community website for Georgians living in Belgium. Bilingual (Georgian + English), free to host, fully coded by you so this becomes the foundation for many future websites.

The project may eventually expand (Georgians elsewhere, other diasporas) — we'll keep the structure flexible.

---

## The 4 phases

### Phase 1 — Static FAQ site (your first 1–3 weeks)
**Goal:** A real, live website at your own domain, with FAQs in Georgian and English.

**What you'll learn:** HTML, CSS, the command line basics, Git, deployment.

**Steps:**
1. **Buy a domain** (~€10/year). Suggested registrar: Cloudflare Registrar — cheapest, no upsell. Suggested names: `georgiansinbelgium.be`, `georgiansinbelgium.com`, or something shorter like `geobel.com`.
2. **Make a free GitHub account** at github.com — this is where your code will live.
3. **Install VS Code** at code.visualstudio.com — this is the program you'll write code in. It's free.
4. **Build the FAQ page** — I'll write it with you, line by line, explaining what each piece does.
5. **Style it with CSS** — colors, fonts, layout.
6. **Deploy via Cloudflare Pages** — connects to GitHub, every save you make goes live automatically. Free.
7. **Point your domain at the deployed site** — done. You have a real website.

**Time estimate:** 8–15 hours of focused work, spread over 1–3 weeks.

---

### Phase 2 — Polished FAQ site (weeks 3–6)
**Goal:** Multi-page site, search, mobile-friendly, real curated content.

**What you'll learn:** JavaScript fundamentals, navigation, responsive design.

**What gets added:**
- Multi-page structure (Home, FAQ categories, About, Contact)
- Language toggle (KA ↔ EN)
- Search/filter for FAQs
- Mobile layout polish
- 30+ real, curated FAQs from the community

---

### Phase 3 — Service directory (weeks 6–12)
**Goal:** Plumbers, drivers, Dutch teachers, etc. can register their service and be listed.

**What you'll learn:** Forms, databases, simple backend logic, basic security.

**What gets added:**
- A free Supabase database
- Public form: "Register your service"
- Listing page with filters (service type, region, language)
- Admin moderation (you approve before things go live, so spam doesn't take over)

---

### Phase 4 — Forum / community (months 3+)
**Goal:** People can discuss things on the site itself.

This is the hardest phase. Two paths:
- **(a) Easy:** Use a free hosted forum (Discourse free tier) and embed/link it.
- **(b) Hard:** Build your own — accounts, login, moderation, anti-spam. Major project.

I recommend (a) first; we revisit (b) only if you really want to build it.

---

## On scraping the Facebook group
Facebook's terms of service forbid automated scraping, and that group is closed (members-only) anyway. Practical alternatives:
- **Ask the group admin** for permission to extract the most-asked questions.
- **Post in the group**: *"I'm building a community site — what's the #1 question you wish was answered when you arrived?"* Use the answers as content.
- **Manually curate** 20–30 of the most-repeated questions you've seen as a member. Faster than it sounds, and quality > quantity.

The manual approach gets you better content than scraping ever would.

---

## What I do vs what you do

**I do:**
- Write the code, explain every line, fix bugs.
- Teach concepts as they come up.
- Review your work and answer questions.

**You do:**
- Buy the domain (I can't make purchases for you).
- Create your own GitHub and Cloudflare accounts (I can't create accounts for you — Anthropic safety rules).
- Run commands on your computer when needed (I'll tell you exactly what to type).
- Decide what content goes on the site.

---

## Right now: your first 3 concrete tasks

These you do; ping me when you're done with each one and I'll move us forward.

1. **Choose a domain name.** Reply with your top choice and I'll check availability and walk you through buying it on Cloudflare Registrar.
2. **Create a free GitHub account** at https://github.com — pick a username you're OK with publicly (e.g. `nicco-gigauri`). 5 minutes.
3. **Install VS Code** at https://code.visualstudio.com — download the macOS version (you're on Mac), drag the app to Applications. 5 minutes.

When all three are done, message me and we'll deploy your first page within an hour.

---

## A starter file already exists in this folder
Open `index.html` (double-click it — it'll open in your browser). That's a working FAQ page in Georgian + English. It's not styled like a final site yet, but it shows you the basic shape of what you'll be building. You can already edit the text inside, save the file, and refresh the browser to see your changes.
