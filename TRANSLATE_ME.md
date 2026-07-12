# Texts still missing a Georgian version

**Updated: 12 July 2026.** The old items in this file (scams.html red flags,
"If you've been scammed" list) are DONE — they're live on the site.
During the July 2026 fix-up, Claude added Georgian to the dynamic UI strings
(results counts, empty states, loading text, buttons) on jobs, housing,
events, forum and services, and expanded the short KA FAQ answers on the
homepage. **Please review those — your Georgian will read better than AI Georgian.**

What genuinely remains EN-only, roughly in order of importance:

## 1. checklists.html — step descriptions (~30 items)
Most step *titles* have Georgian, but the grey description text under each
step is English-only (e.g. "Bring passport, rental contract or host
declaration…"). This is the single biggest remaining gap, and it's the
content newcomers rely on most.
**Tip:** these can also live in the `checklist_items` table (admin panel →
Checklists), so you can translate them gradually from the admin UI instead
of editing HTML.

## 2. forum.html — thread detail view
"Back to all threads", "wrote:", "X replies", "No replies yet. Be the
first.", "Write your reply…", "Post reply as …", "Replies appear
immediately…", "This thread is locked." — all EN-only.

## 3. jobs.html / housing.html / events.html — form labels
Several form labels and placeholders are EN-only: "Description",
"Neighborhood (optional)", "Bedrooms (optional)", "Available from",
"Contract type" options (Full-time, Part-time…), the events submission
modal (all 3 steps), and most placeholder texts.

## 4. scams.html — scam card bodies (#4–#8)
Cards #4–#8 (loan scam, cash work, money mule, fake police, door-to-door)
have EN-only titles and bodies. Cards #1–#3 are bilingual.
**Tip:** same as checklists — these live in the `scam_patterns` table, so
you can add `title_ka` and Georgian descriptions from the admin panel.

## 5. index.html — FAQ answers (review)
Claude expanded the 4 short KA answers (visa, commune, healthcare, driving
licence) to match the EN detail. Review for tone/accuracy.

## 6. 404.html — error page copy
English-only.

## ⚠️ Content conflict to resolve (not a translation)
- index.html FAQ says exchange your Georgian driving licence **within 6
  months**; checklists.html says **within 2 years**. One of these is wrong —
  verify the current rule and align both pages.
