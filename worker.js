// worker.js — server-renders the blog, passes everything else through to the
// static files in this folder.
//
//   /blog                  index of published posts (+ ?tag=news / ?tag=guide)
//   /blog/<slug>           the article
//   /blog/sitemap.xml      sitemap of published posts (linked from robots.txt)
//   /blog.html             301 → /blog            (old static URL)
//   /blog/<slug>.html      301 → /blog/<slug>     (old static URL)
//   everything else        served from the static assets, exactly as before
//
// Pages come out of here as complete HTML — no client-side rendering — so
// Google indexes the full article. The nav and footer are still injected by
// shared.js, the same way every other page on the site does it.

import { renderMarkdown, markdownToText, escapeHtml } from './blog-md.js';

const SITE = 'https://geosin.be';
const CACHE_SECONDS = 300;                       // ~5 min at the edge
const FALLBACK_OG_IMAGE = SITE + '/assets/hero-bruges.jpg';
const PREVIEW_COOKIE = 'gs_blog_preview';        // set by admin.html to view drafts

const POST_COLUMNS =
  'slug,status,published_at,updated_at,tags,title_en,title_ka,summary_en,summary_ka,body_en,body_ka,image_url';

const TAGS = {
  news:  { en: 'News',   ka: 'სიახლეები' },
  guide: { en: 'Guides', ka: 'გზამკვლევები' }
};
const TAG_SINGULAR = {
  news:  { en: 'News',  ka: 'სიახლე' },
  guide: { en: 'Guide', ka: 'გზამკვლევი' }
};

export default {
  async fetch (request, env, ctx) {
    const url = new URL(request.url);
    let path;
    try { path = decodeURIComponent(url.pathname); } catch { path = url.pathname; }
    path = path.replace(/\/{2,}/g, '/');

    // ── 301s from the old static blog (Google has these indexed) ──
    if (path === '/blog.html') return permanent(url, '/blog');
    const oldPost = path.match(/^\/blog\/([A-Za-z0-9._-]+)\.html$/);
    if (oldPost) return permanent(url, '/blog/' + oldPost[1]);

    if (path !== '/blog' && !path.startsWith('/blog/')) {
      return env.ASSETS.fetch(request);
    }

    // ── blog routes ──
    const token = previewToken(request);

    if (path === '/blog/sitemap.xml') {
      return withCache(request, ctx, !token, () => sitemap(env));
    }

    if (path === '/blog' || path === '/blog/') {
      if (path === '/blog/') return permanent(url, '/blog');
      return withCache(request, ctx, !token, () => indexPage(url, env, token));
    }

    const slugMatch = path.match(/^\/blog\/([^/]+)\/?$/);
    if (slugMatch) {
      return withCache(request, ctx, !token, () => postPage(slugMatch[1], env, token, url));
    }

    return notFound(url, env);
  }
};

/* ═══════════════ plumbing ═══════════════ */

function permanent (url, to) {
  const target = new URL(to, url);
  target.search = url.search;
  return Response.redirect(target.toString(), 301);
}

// The admin panel drops a short-lived cookie holding its Supabase access token
// before opening a draft. RLS on the server decides what that token may read —
// the Worker just forwards it.
function previewToken (request) {
  const jar = request.headers.get('cookie') || '';
  const hit = jar.match(new RegExp('(?:^|;\\s*)' + PREVIEW_COOKIE + '=([^;]+)'));
  if (!hit) return null;
  try { return decodeURIComponent(hit[1]); } catch { return hit[1]; }
}

async function withCache (request, ctx, cacheable, build) {
  // An admin previewing a draft must never be served — or fill — a shared cache.
  if (!cacheable) {
    const fresh = await build();
    fresh.headers.set('Cache-Control', 'no-store');
    return fresh;
  }
  const res200 = r => {
    if (r.status === 200) r.headers.set('Cache-Control', 'public, max-age=' + CACHE_SECONDS);
    return r;
  };
  // The Cache API only stores GETs; HEAD still gets the normal cache headers.
  if (request.method !== 'GET') return res200(await build());

  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;

  const res = await build();
  if (res.status === 200) {
    res.headers.set('Cache-Control', 'public, max-age=' + CACHE_SECONDS);
    ctx.waitUntil(cache.put(request, res.clone()));
  }
  return res;
}

async function supabase (env, query, token) {
  const headers = {
    apikey: env.SUPABASE_ANON_KEY,
    accept: 'application/json'
  };
  // Only sent for admin draft previews; anonymous reads stay cacheable.
  if (token) headers.Authorization = 'Bearer ' + token;

  const res = await fetch(env.SUPABASE_URL + '/rest/v1/' + query, { headers });
  if (!res.ok) throw new Error('Supabase ' + res.status + ': ' + (await res.text()).slice(0, 300));
  return res.json();
}

function html (body, status) {
  return new Response(body, {
    status: status || 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// Unknown slug → the site's own 404 page, with a real 404 status.
async function notFound (url, env) {
  const page = await env.ASSETS.fetch(new URL('/404.html', url));
  return new Response(page.body, {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

/* ═══════════════ small formatting helpers ═══════════════ */

const KA_MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
                   'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];

function postDate (p) { return p.published_at || p.updated_at || null; }
function isoDay (v) { return v ? String(v).slice(0, 10) : ''; }

function fmtDate (v, lang) {
  const day = isoDay(v);
  if (!day) return '';
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return day;
  return lang === 'ka'
    ? d + ' ' + KA_MONTHS[m - 1] + ', ' + y
    : d + ' ' + EN_MONTHS[m - 1] + ' ' + y;
}

// Every visible string exists in both languages; CSS (html[lang]) picks one.
function langPair (en, ka, kaClass) {
  const out = ['<span data-lang-block="en">' + en + '</span>'];
  out.push('<span data-lang-block="ka"' + (kaClass ? ' class="ka"' : '') + '>' + (ka || en) + '</span>');
  return out.join('');
}

function pickTag (tags) {
  const list = Array.isArray(tags) ? tags : [];
  return list.find(t => TAGS[t]) || list[0] || null;
}

function absoluteImage (p) {
  const u = (p && p.image_url || '').trim();
  if (!u) return FALLBACK_OG_IMAGE;
  return /^https?:\/\//i.test(u) ? u : SITE + (u.startsWith('/') ? u : '/' + u);
}

function metaDescription (p) {
  return (p.summary_en || markdownToText(p.body_en, 155) || p.title_en || '').trim();
}

/* ═══════════════ page shell ═══════════════ */

function shell (opts) {
  const {
    title, description, canonical, ogType = 'website', ogImage = FALLBACK_OG_IMAGE,
    jsonLd, pageStyle = '', header, main, robots
  } = opts;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-WYHRCQ0D5Y"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-WYHRCQ0D5Y');
  </script>

  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
${robots ? '  <meta name="robots" content="' + escapeHtml(robots) + '" />\n' : ''}\
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:type" content="${escapeHtml(ogType)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <script>
    // Apply saved theme + language before first paint to prevent flash
    (function () {
      var t = localStorage.getItem('geosin-theme')
        || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
      if (localStorage.getItem('geosin-lang') === 'ka') document.documentElement.lang = 'ka';
    })();
  </script>
  <link rel="stylesheet" href="/style.css?v=5" />
  <style>${BLOG_CSS}${pageStyle}</style>
${jsonLd ? '  <script type="application/ld+json">' + JSON.stringify(jsonLd) + '</script>\n' : ''}\
</head>
<body>

<nav class="site-nav" id="site-nav" data-nav></nav>

${header}

${main}

<footer class="site-footer" data-footer="full"></footer>

<script src="/shared.js?v=6"></script>
</body>
</html>`;
}

/* Styles carried over from the old static blog.html / post page, plus the
   thumbnail column the index cards now have. */
const BLOG_CSS = `
    .blog-filters { display:flex; gap:8px; flex-wrap:wrap; padding-bottom:20px;
      border-bottom:1px solid var(--hairline); margin-bottom:28px; }
    .blog-filters .cat-pill { text-decoration:none; }
    .blog-count { font-size:13px; color:var(--muted); margin-bottom:20px; }

    .post-list { display:flex; flex-direction:column; gap:0; border-top:1px solid var(--hairline); }
    .post-row { display:flex; gap:20px; align-items:flex-start; padding:24px 16px;
      border-bottom:1px solid var(--hairline); transition:background .12s; margin:0 -16px; }
    .post-row:hover { background:var(--surface); }
    .post-thumb { flex:0 0 168px; aspect-ratio:16/10; border-radius:var(--r-md);
      overflow:hidden; background:var(--surface); border:1px solid var(--hairline); }
    .post-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
    .post-text { min-width:0; flex:1; }

    .post-meta { display:flex; align-items:center; gap:10px; flex-wrap:wrap;
      font-size:12px; color:var(--muted); margin-bottom:8px; }
    .post-tag { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.8px;
      padding:3px 10px; border-radius:var(--r-full);
      background:var(--surface); color:var(--muted); border:1px solid var(--hairline); }
    .post-tag.news  { background:var(--rausch-light); color:var(--rausch-active); border-color:transparent; }
    .post-tag.guide { background:#e6f4ea; color:#1a7f37; border-color:transparent; }
    [data-theme="dark"] .post-tag.news  { background:#3a0f1a; color:#ff7d96; }
    [data-theme="dark"] .post-tag.guide { background:#0d2013; color:#4ade80; }

    .post-row h2 { font-size:20px; font-weight:700; line-height:1.35; margin-bottom:6px; color:var(--ink); }
    .post-row:hover h2 { color:var(--rausch); }
    .post-row p { font-size:15px; color:var(--body-text); line-height:1.6; max-width:70ch; }
    .post-more { display:inline-flex; align-items:center; gap:5px;
      font-size:14px; font-weight:600; color:var(--rausch); margin-top:10px; }

    .empty-state { background:var(--canvas); border:1px dashed var(--hairline);
      border-radius:var(--r-md); padding:48px 24px; text-align:center; color:var(--muted); }

    .draft-banner { background:var(--rausch); color:#fff; text-align:center;
      padding:10px 16px; font-size:14px; font-weight:600; }

    .article-wrap { max-width:720px; margin:0 auto; }
    .article-back { display:inline-flex; align-items:center; gap:6px;
      font-size:14px; font-weight:600; color:var(--muted); margin-bottom:4px; }
    .article-back:hover { color:var(--rausch); }
    .article-meta { display:flex; align-items:center; gap:10px; flex-wrap:wrap;
      font-size:13px; color:var(--muted); margin-top:12px; }
    .article-hero { margin-bottom:32px; border-radius:var(--r-md); overflow:hidden;
      border:1px solid var(--hairline); }
    .article-hero img { width:100%; height:auto; display:block; }

    .article-body { font-size:17px; line-height:1.75; color:var(--body-text); }
    .article-body > * + * { margin-top:20px; }
    .article-body h2 { font-size:22px; font-weight:700; color:var(--ink); margin-top:40px; line-height:1.3; }
    .article-body h3 { font-size:17px; font-weight:700; color:var(--ink); margin-top:28px; line-height:1.4; }
    .article-body h4 { font-size:16px; font-weight:700; color:var(--ink); margin-top:24px; }
    .article-body strong { color:var(--ink); font-weight:600; }
    .article-body a { color:var(--rausch); text-decoration:underline; text-underline-offset:2px; }
    .article-body a:hover { color:var(--rausch-active); }
    .article-body ul, .article-body ol { padding-left:22px; }
    .article-body ul { list-style:disc; }
    .article-body ol { list-style:decimal; }
    .article-body li { margin-bottom:8px; }
    .article-body li::marker { color:var(--muted-soft); }
    .article-body .lead { font-size:19px; line-height:1.65; color:var(--ink); }
    .article-body code { background:var(--surface); border:1px solid var(--hairline);
      border-radius:4px; padding:1px 5px; font-size:.9em; }
    .article-body hr { margin:36px 0; }
    .article-body hr + p, .article-body hr ~ p:last-child {
      font-size:13.5px; color:var(--muted); line-height:1.7; }
    .article-body hr ~ p a { color:var(--muted); }
    .article-body hr ~ p a:hover { color:var(--rausch); }
    .article-figure img { width:100%; height:auto; border-radius:var(--r-md);
      border:1px solid var(--hairline); display:block; }

    .callout { background:var(--surface); border:1px solid var(--hairline);
      border-left:3px solid var(--rausch); border-radius:var(--r-sm);
      padding:16px 20px; font-size:15px; line-height:1.65; }

    .related-box { margin-top:48px; padding:24px; background:var(--surface);
      border:1px solid var(--hairline); border-radius:var(--r-md); }
    .related-box h4 { font-size:15px; font-weight:700; color:var(--ink); margin-bottom:14px; }
    .related-links { display:flex; flex-direction:column; gap:10px; }
    .related-links a { display:flex; align-items:center; gap:8px; font-size:15px;
      color:var(--ink); font-weight:500; }
    .related-links a:hover { color:var(--rausch); }
    .related-links svg { color:var(--rausch); flex-shrink:0; }

    @media (max-width:700px) {
      .post-row { flex-direction:column; gap:12px; }
      .post-thumb { flex:none; width:100%; aspect-ratio:16/9; }
      .post-row h2 { font-size:18px; }
      .post-row p  { font-size:14px; }
      .article-body { font-size:16px; }
      .article-body .lead { font-size:17px; }
      .article-body h2 { font-size:20px; }
    }
`;

const ARROW = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
const ARROW_SM = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
const ARROW_BACK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';

/* ═══════════════ /blog ═══════════════ */

async function indexPage (url, env, token) {
  const wanted = url.searchParams.get('tag');
  const tag = TAGS[wanted] ? wanted : null;

  const query = token
    ? 'blog_posts?select=' + POST_COLUMNS + '&order=published_at.desc.nullslast,created_at.desc&limit=200'
    : 'blog_posts?select=' + POST_COLUMNS + '&status=eq.published&order=published_at.desc.nullslast&limit=200';

  let posts;
  try {
    posts = await supabase(env, query, token);
  } catch (err) {
    return html(shell({
      title: 'Blog — geosin.be',
      description: 'News and guides for Georgians in Belgium.',
      canonical: SITE + '/blog',
      robots: 'noindex',
      header: indexHeader(),
      main: '<section class="section"><div class="container"><div class="empty-state">' +
            langPair('Could not load posts right now. Please try again in a moment.',
                     'სტატიები ვერ ჩაიტვირთა. სცადეთ ცოტა ხანში.', true) +
            '</div></div></section>'
    }), 503);
  }

  const drafts = posts.filter(p => p.status !== 'published');
  const shown = (tag ? posts.filter(p => (p.tags || []).includes(tag)) : posts);

  const counts = { all: posts.length };
  posts.forEach(p => (p.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));

  const pill = (key, href) => {
    const label = key === 'all'
      ? langPair('All posts', 'ყველა', true)
      : langPair(TAGS[key].en, TAGS[key].ka, true);
    const active = (key === 'all' && !tag) || key === tag;
    return '<a class="cat-pill' + (active ? ' active' : '') + '" href="' + href + '">' +
           label + ' (' + (counts[key] || 0) + ')</a>';
  };

  const filters = '<div class="blog-filters">' +
    pill('all', '/blog') + pill('news', '/blog?tag=news') + pill('guide', '/blog?tag=guide') +
    '</div>';

  const count = '<div class="blog-count">' +
    langPair(shown.length + ' post' + (shown.length === 1 ? '' : 's'),
             shown.length + ' სტატია', true) + '</div>';

  const list = shown.length
    ? '<div class="post-list">' + shown.map(card).join('') + '</div>'
    : '<div class="empty-state">' +
      langPair('No posts in this category yet.', 'ამ კატეგორიაში სტატია ჯერ არ არის.', true) +
      '</div>';

  const banner = (token && drafts.length)
    ? '<div class="draft-banner">Admin preview — ' + drafts.length +
      ' draft' + (drafts.length === 1 ? '' : 's') + ' shown below. Visitors do not see them.</div>'
    : '';

  return html(shell({
    title: 'Blog — news & guides for Georgians in Belgium — geosin.be',
    description: 'Short, practical articles and news for Georgians living in Belgium — paperwork, permits, driving, taxes and everyday life, in Georgian and English.',
    canonical: SITE + '/blog',
    robots: tag ? 'noindex, follow' : null,
    header: banner + indexHeader(),
    main: '<section class="section"><div class="container">' + filters + count + list + '</div></section>',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'geosin.be blog',
      url: SITE + '/blog',
      inLanguage: ['en', 'ka'],
      publisher: { '@type': 'Organization', name: 'geosin.be', url: SITE }
    }
  }));
}

function indexHeader () {
  return `<div class="page-header">
  <div class="container">
    <p class="section-eyebrow" style="margin-bottom:8px">${langPair('News &amp; articles', 'სიახლეები და სტატიები')}</p>
    <h1>${langPair('Blog', 'ბლოგი', true)}</h1>
    <p class="sub">${langPair(
      'Short, practical writing about life in Belgium — rules that change, deadlines worth knowing, and step-by-step guides.',
      'მოკლე, პრაქტიკული სტატიები ბელგიაში ცხოვრებაზე — წესები, რომლებიც იცვლება, მნიშვნელოვანი ვადები და ნაბიჯ-ნაბიჯ გზამკვლევები.',
      true)}</p>
  </div>
</div>`;
}

function card (p) {
  const tag = pickTag(p.tags);
  const day = isoDay(postDate(p));
  const thumb = (p.image_url || '').trim()
    ? '<div class="post-thumb"><img src="' + escapeHtml(p.image_url) + '" alt="" loading="lazy"></div>'
    : '';

  const tagPill = tag
    ? '<span class="post-tag ' + escapeHtml(tag) + '">' +
      (TAG_SINGULAR[tag]
        ? '<span class="en">' + TAG_SINGULAR[tag].en + '</span><span class="ka">' + TAG_SINGULAR[tag].ka + '</span>'
        : escapeHtml(tag)) + '</span>'
    : '';

  const draft = p.status !== 'published'
    ? '<span class="post-tag" style="background:var(--rausch);color:#fff;border-color:transparent">Draft</span>'
    : '';

  const summary = (p.summary_en || markdownToText(p.body_en, 180) || '');
  const summaryKa = (p.summary_ka || markdownToText(p.body_ka, 180) || summary);

  return '<a class="post-row" href="/blog/' + encodeURIComponent(p.slug) + '">' +
    thumb +
    '<div class="post-text">' +
      '<div class="post-meta">' + draft + tagPill +
        (day ? '<time datetime="' + day + '">' +
          langPair(fmtDate(day, 'en'), fmtDate(day, 'ka'), true) + '</time>' : '') +
      '</div>' +
      '<h2>' + langPair(escapeHtml(p.title_en || p.slug), escapeHtml(p.title_ka || p.title_en || p.slug), true) + '</h2>' +
      (summary ? '<p>' + langPair(escapeHtml(summary), escapeHtml(summaryKa), true) + '</p>' : '') +
      '<span class="post-more"><span class="en">Read more</span><span class="ka">სრულად წაკითხვა</span>' + ARROW + '</span>' +
    '</div>' +
  '</a>';
}

/* ═══════════════ /blog/<slug> ═══════════════ */

async function postPage (slug, env, token, url) {
  const query = 'blog_posts?select=' + POST_COLUMNS +
                '&slug=eq.' + encodeURIComponent(slug) + '&limit=1' +
                (token ? '' : '&status=eq.published');

  let rows;
  try {
    rows = await supabase(env, query, token);
  } catch (err) {
    return html('<h1>Temporarily unavailable</h1><p>Please try again in a moment.</p>', 503);
  }
  const p = rows && rows[0];
  if (!p) return notFound(url, env);

  const day = isoDay(postDate(p));
  const tag = pickTag(p.tags);
  const canonical = SITE + '/blog/' + encodeURIComponent(p.slug);
  const image = absoluteImage(p);
  const description = metaDescription(p);

  const eyebrow = tag && TAG_SINGULAR[tag]
    ? langPair(TAG_SINGULAR[tag].en, TAG_SINGULAR[tag].ka)
    : langPair('Article', 'სტატია');

  const banner = p.status !== 'published'
    ? '<div class="draft-banner">Draft — only you can see this page. Publish it in the admin panel to make it live.</div>'
    : '';

  const header = banner + `<div class="page-header">
  <div class="container">
    <div class="article-wrap">
      <a href="/blog" class="article-back">${ARROW_BACK}${langPair('Blog', 'ბლოგი', true)}</a>
      <p class="section-eyebrow" style="margin-bottom:8px">${eyebrow}</p>
      <h1>${langPair(escapeHtml(p.title_en || p.slug), escapeHtml(p.title_ka || p.title_en || p.slug), true)}</h1>
      ${(p.summary_en || p.summary_ka) ? '<p class="sub">' + langPair(escapeHtml(p.summary_en || ''), escapeHtml(p.summary_ka || p.summary_en || ''), true) + '</p>' : ''}
      <div class="article-meta">
        ${tag && TAG_SINGULAR[tag] ? '<span class="post-tag ' + escapeHtml(tag) + '"><span class="en">' + TAG_SINGULAR[tag].en + '</span><span class="ka">' + TAG_SINGULAR[tag].ka + '</span></span>' : ''}
        ${day ? '<time datetime="' + day + '">' + langPair(fmtDate(day, 'en'), fmtDate(day, 'ka'), true) + '</time>' : ''}
      </div>
    </div>
  </div>
</div>`;

  const hero = (p.image_url || '').trim()
    ? '<div class="article-hero"><img src="' + escapeHtml(p.image_url) + '" alt="' +
      escapeHtml(p.title_en || '') + '"></div>'
    : '';

  const bodyEn = p.body_en
    ? '<article class="article-body" data-lang-block="en">' + renderMarkdown(p.body_en) + '</article>'
    : '';
  const bodyKa = p.body_ka
    ? '<article class="article-body ka" data-lang-block="ka">' + renderMarkdown(p.body_ka) + '</article>'
    // Fall back to English if the post hasn't been translated yet.
    : (p.body_en ? '<article class="article-body" data-lang-block="ka">' + renderMarkdown(p.body_en) + '</article>' : '');

  const main = `<section class="section">
  <div class="container">
    <div class="article-wrap">
      ${hero}
      ${bodyEn}
      ${bodyKa}
      ${RELATED_BOX}
    </div>
  </div>
</section>`;

  return html(shell({
    title: (p.title_en || p.slug) + ' — geosin.be',
    description,
    canonical,
    ogType: 'article',
    ogImage: image,
    robots: p.status === 'published' ? null : 'noindex, nofollow',
    header,
    main,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: p.title_en || p.slug,
      description,
      inLanguage: ['en', 'ka'],
      datePublished: postDate(p) || undefined,
      dateModified: p.updated_at || postDate(p) || undefined,
      image,
      author:    { '@type': 'Organization', name: 'geosin.be', url: SITE },
      publisher: { '@type': 'Organization', name: 'geosin.be', url: SITE },
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical }
    }
  }));
}

const RELATED_BOX = `<div class="related-box">
  <h4>${langPair('Related on geosin.be', 'დაკავშირებული გვერდები', true)}</h4>
  <div class="related-links">
    <a href="/services.html">${ARROW_SM}${langPair('Services — Georgian professionals in Belgium', 'სერვისები — ქართველი პროფესიონალები ბელგიაში', true)}</a>
    <a href="/guides.html">${ARROW_SM}${langPair('Guides — all questions about life in Belgium', 'გზამკვლევები — ყველა კითხვა ბელგიაში ცხოვრებაზე', true)}</a>
    <a href="/forum.html">${ARROW_SM}${langPair('Forum — ask the community', 'ფორუმი — ჰკითხეთ თემს', true)}</a>
  </div>
</div>`;

/* ═══════════════ /blog/sitemap.xml ═══════════════ */

async function sitemap (env) {
  let posts = [];
  try {
    posts = await supabase(env,
      'blog_posts?select=slug,published_at,updated_at&status=eq.published&order=published_at.desc.nullslast&limit=1000');
  } catch (err) { /* fall through to a sitemap with just the index */ }

  const urls = [
    '  <url>\n    <loc>' + SITE + '/blog</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>'
  ];
  for (const p of posts) {
    const last = isoDay(p.updated_at || p.published_at);
    urls.push('  <url>\n    <loc>' + SITE + '/blog/' + encodeURIComponent(p.slug) + '</loc>' +
      (last ? '\n    <lastmod>' + last + '</lastmod>' : '') +
      '\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>');
  }

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join('\n') + '\n</urlset>\n';

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
