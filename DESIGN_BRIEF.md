# Design brief — geosin.be (Georgians in Belgium)

## What I'm building
A bilingual community-resource website for Georgians living in or moving to Belgium. Already live and functional at https://geosin.be — I want a visual redesign that uses the **structure, hierarchy, and feel of the attached screenshot** as inspiration. Don't copy it verbatim; adapt it to my pages and content.

## Tech constraints
- Plain HTML, CSS, and a small amount of vanilla JavaScript. **No React, Tailwind, Vue, or build tools.** Output must be raw `.html` and `.css` files I can drop into a Cloudflare Pages site.
- One shared `style.css` that all pages link to. Per-page `<style>` blocks only if necessary.
- Mobile-first responsive. Most visitors will be on phones.
- Semantic HTML (`<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`). Keyboard-navigable. Sufficient color contrast.
- Must support **Georgian script** (the Mkhedruli alphabet — needs a font like BPG Arial, Sylfaen, or any modern Georgian-supporting webfont). Latin text uses Inter or similar.

## Brand
- Cream background `#faf8f3`
- Ink `#1a1a1a`
- Georgian red `#d62828`
- Belgian blue `#003566`
- Muted gray `#6a6a6a`
- Subtle border `#e5e2da`

You may extend the palette but keep these as the anchor.

## Tone
Practical, warm, slightly understated. The audience is immigrants navigating bureaucracy — clarity beats flashiness. Think Substack, Are.na, or a thoughtfully-built personal site. Not a startup landing page.

## Pages and what each needs

### 1. Home / FAQ — `index.html`
- Top navigation bar: brand mark "geosin.be", links to FAQ (active), Services, About
- Hero: site title in English + Georgian, short subtitle in both
- A small **language toggle** (pill buttons "EN" / "ქართული") that switches the FAQ section between English and Georgian
- A **search input** that filters the FAQ list as the user types
- ~15 FAQ entries presented as an accordion (click question → answer expands). Each entry has a question and a 1–3 sentence answer. Some answers contain `<em>` and `<strong>` tags inline.
- Footer

### 2. Services — `services.html`
- Same nav
- Hero: title + subtitle
- **"Find a service" section**:
  - Filter bar: search input + category dropdown
  - Grid (or stacked column) of service cards. Each card shows: a category badge (small pill), the region served, the service/business name, a 2–3-sentence description, the languages spoken, and contact links (email, phone, website)
- Visual divider
- **"Offer a service?" section**:
  - Registration form: category dropdown, name, description (textarea), region, languages, email, phone (optional), website (optional), submit button
  - Inline success and error message styling
- Footer

### 3. About — `about.html`
- Same nav
- Hero: "About" + short subtitle
- Article-style prose with sections: Why this exists, Community resources, How submissions and data work, Contact, Open source. Includes one short Georgian-language section at the end.
- Footer

### 4. Forum — `forum.html` (coming-soon placeholder)
- Same nav
- Hero: "Forum" + "Coming soon" subtitle
- A highlighted callout box with: what's planned, and a prominent CTA link to the existing Facebook group as the alternative for now
- Footer

### 5. 404 — `404.html`
- Same nav
- Hero: "Page not found" headline + a one-line apology in English and Georgian
- Helpful links back to FAQ / Services / About
- Footer

## Functional behavior to preserve (don't break these)
1. Language toggle hides one entire language section while keeping the other visible. Choice persists across visits via `localStorage`.
2. FAQ search filters entries within the currently-visible language section.
3. Service cards are loaded dynamically from a Supabase database via JavaScript. Your design needs an empty container for the listings, plus a "loading" state and an "empty" state.
4. The registration form submits to Supabase via JavaScript and shows inline success/error messages.

I'll keep the JavaScript working — you just need to include the right elements with the right IDs/classes (or tell me what to rename in the JS to match your design).

## What I want back

For each page, complete HTML and CSS that I can deploy as-is. Specifically:
1. **`style.css`** — single shared stylesheet with all design tokens, typography, layout primitives, and component styles
2. **`index.html`** — full FAQ page with sample placeholder FAQ content (I'll replace with real content)
3. **`services.html`** — full Services page with placeholder service cards (I'll wire up to live data)
4. **`about.html`** — full About page with placeholder copy
5. **`forum.html`** — full Forum coming-soon page
6. **`404.html`** — full 404 page

If you'd rather output design specs than code, that also works: high-fidelity mockups for each page + a style guide (color tokens, type scale, spacing scale, component definitions) precise enough that I can implement it from your spec.

## Reference
The structure, spacing rhythm, typographic hierarchy, and overall feel of the **attached screenshot**. Match its discipline; adapt its details. If something in the reference doesn't apply to my use case, replace it with the equivalent for my content.
