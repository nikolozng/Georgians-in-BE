// blog-md.js — the tiny markdown renderer used by the blog.
//
// ONE copy, two consumers:
//   • worker.js         imports it (bundled by wrangler) to server-render posts
//   • admin.html        loads it as a module for the live preview toggle
// so what you see in the admin preview is exactly what visitors get.
//
// Supported on purpose (nothing else — keep posts simple):
//   ## heading   ### subheading
//   paragraphs (blank line between them; the first one becomes the .lead)
//   **bold**   *italic*   `code`
//   [text](https://…)   ![alt](https://…)
//   - bullet lists   1. numbered lists
//   > quote  → rendered as the .callout box
//   ---      → horizontal rule

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);
}

// Only real web links survive — blocks javascript:, data:, etc.
// Note: input is already HTML-escaped, so '&' arrives as '&amp;'.
function safeHref (u) {
  u = String(u || '').trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (/^mailto:[^\s]+$/i.test(u)) return u;
  if (/^\/[^\/]/.test(u) || u === '/') return u;   // same-site link like /services.html
  if (/^#[\w-]+$/.test(u)) return u;
  return '';
}

function isExternal (u) { return /^https?:\/\//i.test(u); }

/* ---------- inline formatting ---------- */

function inline (text) {
  // Links and images are pulled out first so that ** and _ inside a URL
  // can never be mistaken for emphasis.
  const slots = [];
  // The NUL sentinel is stripped from the input in renderMarkdown(), so a
  // placeholder can never collide with a real number in the text.
  const park = html => { slots.push(html); return '\u0000' + (slots.length - 1) + '\u0000'; };

  text = text.replace(/!\[([^\]]*)\]\(([^()\s]+)\)/g, (m, alt, url) => {
    const href = safeHref(url);
    if (!href) return alt;
    return park('<img src="' + href + '" alt="' + alt + '" loading="lazy">');
  });

  text = text.replace(/\[([^\]]+)\]\(([^()\s]+)\)/g, (m, label, url) => {
    const href = safeHref(url);
    if (!href) return label;
    const ext = isExternal(href) ? ' target="_blank" rel="noopener"' : '';
    return park('<a href="' + href + '"' + ext + '>' + label + '</a>');
  });

  text = text.replace(/`([^`]+)`/g, (m, code) => park('<code>' + code + '</code>'));

  text = text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');

  return text.replace(/\u0000(\d+)\u0000/g, (m, i) => slots[+i]);
}

/* ---------- block formatting ---------- */

export function renderMarkdown (md) {
  if (!md) return '';
  const blocks = escapeHtml(String(md).replace(/\u0000/g, ''))
    .replace(/\r\n?/g, '\n').split(/\n{2,}/);
  let leadUsed = false;
  const out = [];

  for (const raw of blocks) {
    const block = raw.replace(/^\n+|\n+$/g, '');
    if (!block.trim()) continue;
    const lines = block.split('\n');

    // --- horizontal rule ---
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(block)) { out.push('<hr>'); continue; }

    // --- heading ---  (a single # is levelled up to h2: the page already has an h1)
    const h = block.match(/^(#{1,4})\s+(.*)$/);
    if (h && lines.length === 1) {
      const level = Math.min(Math.max(h[1].length, 2), 4);
      out.push('<h' + level + '>' + inline(h[2].trim()) + '</h' + level + '>');
      continue;
    }

    // --- quote → callout box ---
    // ('>' is already '&gt;' here: the whole document is HTML-escaped up front.)
    if (lines.every(l => /^&gt;\s?/.test(l))) {
      const body = lines.map(l => l.replace(/^&gt;\s?/, '')).join(' ');
      out.push('<div class="callout">' + inline(body) + '</div>');
      continue;
    }

    // --- bullet list ---
    if (lines.every(l => /^\s*[-*]\s+/.test(l))) {
      out.push('<ul>' + lines.map(l =>
        '<li>' + inline(l.replace(/^\s*[-*]\s+/, '')) + '</li>').join('') + '</ul>');
      continue;
    }

    // --- numbered list ---
    if (lines.every(l => /^\s*\d+\.\s+/.test(l))) {
      out.push('<ol>' + lines.map(l =>
        '<li>' + inline(l.replace(/^\s*\d+\.\s+/, '')) + '</li>').join('') + '</ol>');
      continue;
    }

    // --- image on its own line → figure ---
    const img = block.match(/^!\[([^\]]*)\]\(([^()\s]+)\)$/);
    if (img) {
      const href = safeHref(img[2]);
      if (href) {
        out.push('<figure class="article-figure"><img src="' + href +
                 '" alt="' + img[1] + '" loading="lazy"></figure>');
        continue;
      }
    }

    // --- paragraph (first one is the lead) ---
    const cls = leadUsed ? '' : ' class="lead"';
    leadUsed = true;
    out.push('<p' + cls + '>' + inline(lines.join(' ')) + '</p>');
  }

  return out.join('\n');
}

/* Plain-text version — used for meta descriptions when a summary is missing. */
export function markdownToText (md, limit) {
  const txt = String(md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[#>\-*]+\s*/gm, '')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!limit || txt.length <= limit) return txt;
  return txt.slice(0, limit).replace(/\s+\S*$/, '') + '…';
}
