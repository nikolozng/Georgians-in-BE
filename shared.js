// shared.js — ONE place for everything that used to be copy-pasted into every page:
//   • the navbar          (edit NAV_HTML below → changes on every page)
//   • the footer          (FOOTER_FULL / FOOTER_SIMPLE)
//   • the language toggle (setLang)
//   • small helpers       (escapeHtml, timeAgo, toggleMobileNav, toggleFaq)
//
// Load order on every page:  shared.js  →  supabase  →  auth.js  →  page script.
// (shared.js must come first so auth.js finds #nav-actions in the injected nav.)
//
// Pages opt in with empty placeholders:
//   <nav class="site-nav" id="site-nav" data-nav></nav>
//   <footer class="site-footer" data-footer="full"></footer>   (or "simple")
//
// Pages can react to language changes by defining:
//   window.onLangChange = function (lang) { ... }

(function () {

  /* ────────── Helpers (were duplicated in ~10 pages) ────────── */

  window.escapeHtml = function (s) {
    return String(s == null ? '' : s).replace(/[<>&"']/g, c =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]);
  };
  window.escapeHTML = window.escapeHtml; // old alias used by account.html

  // Only allow real web links in user-submitted URLs (blocks javascript: etc.)
  window.safeUrl = function (u) {
    u = String(u == null ? '' : u).trim();
    return /^https?:\/\//i.test(u) ? u : '';
  };

  window.timeAgo = function (iso) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 86400 * 30) return Math.floor(s / 86400) + 'd ago';
    return new Date(iso).toLocaleDateString();
  };

  window.setLang = function (lang) {
    localStorage.setItem('geosin-lang', lang);
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    document.querySelectorAll('[data-lang-block]').forEach(el => {
      el.style.display = el.dataset.langBlock === lang ? '' : 'none';
    });
    document.querySelectorAll('[data-placeholder-en]').forEach(el => {
      el.placeholder = lang === 'ka' ? el.dataset.placeholderKa : el.dataset.placeholderEn;
    });
    // html[lang] drives the CSS that shows/hides .en and .ka spans (style.css)
    document.documentElement.lang = lang === 'ka' ? 'ka' : 'en';
    if (typeof window.onLangChange === 'function') window.onLangChange(lang);
  };

  window.toggleMobileNav = function () {
    const nav = document.getElementById('site-nav');
    const opened = nav.classList.toggle('nav-mobile-open');
    document.body.classList.toggle('has-mobile-nav-open', opened);
  };

  window.toggleFaq = function (btn) {
    btn.closest('.faq-item').classList.toggle('open');
  };

  /* ────────── Theme (dark / light) ────────── */

  function applyTheme (theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const moon = document.getElementById('theme-icon-moon');
    const sun  = document.getElementById('theme-icon-sun');
    if (moon) moon.style.display = theme === 'dark' ? 'none'  : '';
    if (sun)  sun.style.display  = theme === 'dark' ? ''      : 'none';
  }

  window.toggleTheme = function () {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('geosin-theme', next);
    applyTheme(next);
  };

  // Apply saved theme immediately (before any paint) to avoid flash
  (function () {
    const saved = localStorage.getItem('geosin-theme');
    // If user explicitly chose a theme, honour it; otherwise respect OS preference
    const theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  })();

  /* ────────── Navbar ────────── */
  // Root-relative hrefs (/jobs.html) so links also work from the 404 page
  // at any URL depth. data-page is used to highlight the current page.

  const NAV_HTML = `
  <div class="container nav-inner">
    <a href="/index.html" class="nav-logo">
      <div class="nav-logo-mark">G</div>
      <span class="nav-logo-text">geosin<span>.be</span></span>
    </a>
    <div class="nav-links" id="nav-links">
      <a href="/index.html" data-page="index.html"><span class="en">Home</span><span class="ka">მთავარი</span></a>
      <a href="/services.html" data-page="services.html"><span class="en">Services</span><span class="ka">სერვისები</span></a>
      <a href="/jobs.html" data-page="jobs.html"><span class="en">Jobs</span><span class="ka">ვაკანსიები</span></a>
      <a href="/housing.html" data-page="housing.html"><span class="en">Housing</span><span class="ka">ბინები</span></a>
      <div class="nav-dropdown">
        <button type="button" class="nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">
          <span class="en">Community</span><span class="ka">საზოგადოება</span>
          <svg class="nav-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="nav-dropdown-menu">
          <a href="/events.html" data-page="events.html"><span class="en">Events</span><span class="ka">ღონისძიებები</span></a>
          <a href="/forum.html" data-page="forum.html"><span class="en">Forum</span><span class="ka">ფორუმი</span></a>
          <a href="/places.html" data-page="places.html"><span class="en">Places</span><span class="ka">ადგილები</span></a>
        </div>
      </div>
      <div class="nav-dropdown">
        <button type="button" class="nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">
          <span class="en">Guides</span><span class="ka">გზამკვლევები</span>
          <svg class="nav-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="nav-dropdown-menu">
          <a href="/guides.html" data-page="guides.html"><span class="en">Q&amp;A — Life in Belgium</span><span class="ka">კითხვა-პასუხი</span></a>
          <a href="/checklists.html" data-page="checklists.html"><span class="en">Checklists</span><span class="ka">ჩეკლისტები</span></a>
          <a href="/scams.html" data-page="scams.html"><span class="en">Avoid Scams</span><span class="ka">თაღლითობის პრევენცია</span></a>
        </div>
      </div>
    </div>
    <div class="nav-actions" id="nav-actions">
      <div class="lang-toggle">
        <button class="lang-btn active" data-lang="en" onclick="setLang('en')">EN</button>
        <button class="lang-btn" data-lang="ka" onclick="setLang('ka')">KA</button>
      </div>
      <button class="theme-toggle" id="theme-toggle" onclick="toggleTheme()" aria-label="Toggle dark mode" title="Toggle dark mode">
        <svg id="theme-icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        <svg id="theme-icon-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      </button>
    </div>
    <div class="nav-hamburger" onclick="toggleMobileNav()" aria-label="Open menu">
      <span></span><span></span><span></span>
    </div>
  </div>`;

  /* ────────── Footers ────────── */

  const FOOTER_FULL = `
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <a href="/index.html" class="nav-logo">
          <div class="nav-logo-mark">G</div>
          <span class="nav-logo-text">geosin<span>.be</span></span>
        </a>
        <p>
          <span class="en">A practical hub for Georgians in Belgium. Free for everyone, run by volunteers.</span>
          <span class="ka">პრაქტიკული ჰაბი ბელგიაში მცხოვრები ქართველებისთვის. უფასოა ყველასთვის, იმართება მოხალისეების მიერ.</span>
        </p>
        <div style="display:flex;gap:10px;margin-top:14px">
          <a href="https://www.facebook.com/groups/georgiansinbelgium" target="_blank" rel="noopener" aria-label="Facebook" style="width:34px;height:34px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;color:var(--muted);text-decoration:none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.5 2.9h-2.3v7A10 10 0 0 0 22 12z"/></svg>
          </a>
          <a href="mailto:hello@geosin.be" aria-label="Email" style="width:34px;height:34px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;color:var(--muted);text-decoration:none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </a>
        </div>
      </div>
      <div class="footer-col">
        <h5><span class="en">Site</span><span class="ka">საიტი</span></h5>
        <ul>
          <li><a href="/services.html"><span class="en">Services</span><span class="ka">სერვისები</span></a></li>
          <li><a href="/jobs.html"><span class="en">Jobs</span><span class="ka">ვაკანსიები</span></a></li>
          <li><a href="/housing.html"><span class="en">Housing</span><span class="ka">ბინები</span></a></li>
          <li><a href="/forum.html"><span class="en">Forum</span><span class="ka">ფორუმი</span></a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h5><span class="en">Resources</span><span class="ka">რესურსები</span></h5>
        <ul>
          <li><a href="/checklists.html"><span class="en">Checklists</span><span class="ka">ჩეკლისტები</span></a></li>
          <li><a href="/scams.html"><span class="en">Avoid Scams</span><span class="ka">თაღლითობის პრევენცია</span></a></li>
          <li><a href="/guides.html"><span class="en">Guides / FAQ</span><span class="ka">გზამკვლევები</span></a></li>
          <li><a href="/about.html"><span class="en">About</span><span class="ka">შესახებ</span></a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h5><span class="en">Account</span><span class="ka">ანგარიში</span></h5>
        <ul>
          <li><a href="/signup.html"><span class="en">Sign up</span><span class="ka">რეგისტრაცია</span></a></li>
          <li><a href="/login.html"><span class="en">Log in</span><span class="ka">შესვლა</span></a></li>
          <li><a href="/account.html"><span class="en">My account</span><span class="ka">ჩემი პროფილი</span></a></li>
          <li><a href="mailto:hello@geosin.be"><span class="en">Contact</span><span class="ka">კონტაქტი</span></a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span><span class="en">&copy; ${new Date().getFullYear()} geosin.be — made with care for the Georgian community in Belgium</span><span class="ka">&copy; ${new Date().getFullYear()} geosin.be — სიყვარულით შექმნილი ბელგიის ქართული თემისთვის.</span></span>
      <span style="display:flex;gap:16px"><a href="/privacy.html"><span class="en">Privacy</span><span class="ka">კონფიდენციალურობა</span></a><a href="mailto:hello@geosin.be">hello@geosin.be</a></span>
    </div>
  </div>`;

  const FOOTER_SIMPLE = `
  <div class="container">
    <div class="footer-bottom">
      <span><span class="en">&copy; ${new Date().getFullYear()} geosin.be</span><span class="ka">&copy; ${new Date().getFullYear()} geosin.be</span></span>
      <span style="display:flex;gap:16px"><a href="/privacy.html"><span class="en">Privacy</span><span class="ka">კონფიდენციალურობა</span></a><a href="mailto:hello@geosin.be">hello@geosin.be</a></span>
    </div>
  </div>`;

  /* ────────── Inject ────────── */

  function inject() {
    const nav = document.querySelector('nav[data-nav]');
    if (nav) {
      nav.innerHTML = NAV_HTML;
      // Highlight the current page's link.
      // Live site serves clean URLs (/services instead of /services.html),
      // so add the .html back before matching against data-page.
      let page = location.pathname.split('/').pop() || 'index.html';
      if (!page.includes('.')) page += '.html';
      const link = nav.querySelector('a[data-page="' + page + '"]');
      if (link) {
        link.classList.add('active');
        // If the page lives inside a dropdown, highlight the dropdown button too
        const dropdown = link.closest('.nav-dropdown');
        if (dropdown) dropdown.querySelector('.nav-dropdown-toggle').classList.add('active');
      }
    }
    const footer = document.querySelector('footer[data-footer]');
    if (footer) {
      footer.innerHTML = footer.dataset.footer === 'simple' ? FOOTER_SIMPLE : FOOTER_FULL;
    }
    // Apply the saved language to everything, including what we just injected
    window.setLang(localStorage.getItem('geosin-lang') || 'en');
    // Sync theme icon with the already-applied theme
    const savedTheme = localStorage.getItem('geosin-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

  /* ────────── "New since your last visit" nav badges ──────────
     Counts approved posts newer than your previous visit and shows a
     small badge on the nav links. No account or emails needed.
     Throttled: results are cached for 1 hour in localStorage. */
  (function () {
    var TABLES = [
      { table: 'jobs',          page: 'jobs.html' },
      { table: 'housing',       page: 'housing.html' },
      { table: 'events',        page: 'events.html' },
      { table: 'forum_threads', page: 'forum.html' },
      { table: 'places',        page: 'places.html' }
    ];
    function lsGet (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function lsSet (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

    // A "visit" = one browser session. On a new session, the previous
    // session's start time becomes the comparison point.
    var now = new Date().toISOString();
    try {
      if (!sessionStorage.getItem('geosin-visit')) {
        sessionStorage.setItem('geosin-visit', '1');
        var cur = lsGet('geosin-seen-now');
        if (cur) lsSet('geosin-seen-prev', cur);
        lsSet('geosin-seen-now', now);
      }
    } catch (e) {}

    // Being ON a section page marks it as seen (clears its badge).
    // Same clean-URL handling as the nav highlight above.
    var here = location.pathname.split('/').pop() || 'index.html';
    if (here.indexOf('.') === -1) here += '.html';
    TABLES.forEach(function (t) { if (t.page === here) lsSet('geosin-seen-' + t.table, now); });

    var prev = lsGet('geosin-seen-prev');
    if (!prev) return; // first-ever visit — nothing to compare against

    function baselineFor (t) {
      var seen = lsGet('geosin-seen-' + t.table);
      return (seen && seen > prev) ? seen : prev;
    }

    function renderBadges (counts) {
      TABLES.forEach(function (t) {
        var link = document.querySelector('#nav-links a[data-page="' + t.page + '"]');
        if (!link) return;
        var old = link.querySelector('.nav-new-badge');
        if (old) old.remove();
        var n = counts[t.table] || 0;
        if (n > 0) {
          var b = document.createElement('span');
          b.className = 'nav-new-badge';
          b.textContent = n > 9 ? '9+' : String(n);
          link.style.position = 'relative';
          link.appendChild(b);
          // Links inside a dropdown also get a dot on the dropdown toggle
          var dd = link.closest('.nav-dropdown');
          if (dd) {
            var tg = dd.querySelector('.nav-dropdown-toggle');
            if (tg && !tg.querySelector('.nav-new-dot')) {
              var d = document.createElement('span');
              d.className = 'nav-new-dot';
              tg.style.position = 'relative';
              tg.appendChild(d);
            }
          }
        }
      });
    }

    function check () {
      if (!window.sb) return;
      var key = TABLES.map(baselineFor).join('|');
      var cached = null;
      try { cached = JSON.parse(lsGet('geosin-new-cache') || 'null'); } catch (e) {}
      if (cached && cached.key === key && (Date.now() - cached.ts) < 3600000) {
        renderBadges(cached.counts);
        return;
      }
      Promise.all(TABLES.map(function (t) {
        return window.sb.from(t.table)
          .select('id', { count: 'exact', head: true })
          .eq('approved', true)
          .gt('created_at', baselineFor(t))
          .then(function (r) { return r.count || 0; }, function () { return 0; });
      })).then(function (nums) {
        var counts = {};
        TABLES.forEach(function (t, i) { counts[t.table] = nums[i]; });
        lsSet('geosin-new-cache', JSON.stringify({ ts: Date.now(), key: key, counts: counts }));
        renderBadges(counts);
      }).catch(function () {});
    }

    // Wait until both the nav is injected and auth.js has created window.sb
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (window.sb && document.querySelector('#nav-links')) { clearInterval(iv); check(); }
      else if (tries > 40) clearInterval(iv); // give up quietly after ~10s
    }, 250);
  })();
})();
