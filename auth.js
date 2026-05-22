// auth.js — shared authentication helper for geosin.be
// Loaded on every page. Provides:
//   • window.sb         — the Supabase client
//   • window.AUTH       — helpers (getUser, getProfile, signOut, ...)
//   • Auth-aware nav    — automatically renders Login/Signup OR Account/🔔/Logout
//
// Requires: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// loaded BEFORE this file.

(function () {
  const SUPABASE_URL = 'https://kikvckuaorpspxhtnpzd.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_FsuRAVFjLNQ1q650FHw2cA_UhtakskW';

  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.error('auth.js: Supabase library not loaded');
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Bypass the Web Locks API. The Supabase client uses it to coordinate
      // token refreshes between tabs, but a stuck/ghost lock will cause
      // getSession() to hang forever. For a small site this is safe.
      lock: (_name, _acquireTimeout, fn) => fn()
    }
  });
  window.sb = sb;

  // ────────── List of incognito names (matches forum dropdown) ──────────
  const INCOGNITO_NAMES = [
    'Tariel', 'Avtandil', 'NestanDarejan', 'Tinatin', 'BashiAchuki',
    'Jokola', 'Zviadauri', 'Aluda', 'DataTutashkhia', 'Mushni',
    'Kvachi', 'Luarsab', 'Lia', 'Akaki', 'Vazha', 'Galaktion',
    'Titsian', 'Paolo', 'Besiki', 'Chabua', 'SulkhanSaba',
    'Javakha', 'Shota'
  ];

  function pickRandomIncognito() {
    return INCOGNITO_NAMES[Math.floor(Math.random() * INCOGNITO_NAMES.length)];
  }

  // e.g. "Tariel_4827" — used as the auto-assigned forum incognito name
  function pickRandomIncognitoWithNumber() {
    const name = pickRandomIncognito();
    const num  = Math.floor(1000 + Math.random() * 9000);
    return `${name}_${num}`;
  }

  // Returns the user's incognito name. Auto-creates one if none exists yet.
  // Called the first time a user toggles "Post as incognito" in the forum.
  async function ensureIncognitoName() {
    const user = await getUser();
    if (!user) return null;
    let profile = await getProfile();
    if (profile && profile.incognito_name) return profile.incognito_name;

    const newName = pickRandomIncognitoWithNumber();
    const display = (user.user_metadata && user.user_metadata.display_name)
                  || user.email.split('@')[0];

    if (profile) {
      const { data } = await sb.from('profiles')
        .update({ incognito_name: newName })
        .eq('id', user.id)
        .select()
        .single();
      // Update the cache so callers don't have to re-fetch.
      _profileCache = data || { ...profile, incognito_name: newName };
    } else {
      const { data } = await sb.from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          display_name: display,
          incognito_name: newName
        })
        .select()
        .single();
      _profileCache = data || {
        id: user.id, email: user.email, display_name: display, incognito_name: newName
      };
    }
    return newName;
  }

  // ────────── In-memory cache ──────────
  // Avoid hitting Supabase for getUser/getProfile on every interaction.
  // Cleared when auth state changes (sign in / sign out / token refresh).
  // undefined = not loaded yet, null = loaded-and-empty, object = loaded value.
  let _userCache = undefined;
  let _profileCache = undefined;
  let _userPromise = null;     // in-flight dedup so two callers don't both fetch
  let _profilePromise = null;

  function clearAuthCache() {
    _userCache = undefined;
    _profileCache = undefined;
    _userPromise = null;
    _profilePromise = null;
  }
  window._clearAuthCache = clearAuthCache; // exposed for debugging

  // ────────── Helpers ──────────
  async function getUser() {
    if (_userCache !== undefined) return _userCache;
    if (_userPromise) return _userPromise;
    _userPromise = (async () => {
      try {
        const { data } = await Promise.race([
          sb.auth.getSession(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('getSession timed out after 5s')), 5000))
        ]);
        _userCache = data?.session?.user || null;
        return _userCache;
      } catch (e) {
        console.error('auth.getUser:', e);
        _userCache = null;
        return null;
      } finally {
        _userPromise = null;
      }
    })();
    return _userPromise;
  }

  async function getProfile() {
    if (_profileCache !== undefined) return _profileCache;
    if (_profilePromise) return _profilePromise;
    _profilePromise = (async () => {
      try {
        const u = await getUser();
        if (!u) { _profileCache = null; return null; }
        const { data } = await sb.from('profiles').select('*').eq('id', u.id).maybeSingle();
        _profileCache = data || null;
        return _profileCache;
      } finally {
        _profilePromise = null;
      }
    })();
    return _profilePromise;
  }

  async function signOut() {
    await sb.auth.signOut();
    window.location.href = 'index.html';
  }

  async function requireAuth(redirectTo) {
    const u = await getUser();
    if (!u) {
      const next = redirectTo || (location.pathname + location.search);
      location.href = 'login.html?next=' + encodeURIComponent(next);
      return null;
    }
    return u;
  }

  async function unreadNotificationCount() {
    const u = await getUser();
    if (!u) return 0;
    const { count } = await sb
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', u.id)
      .eq('read', false);
    return count || 0;
  }

  window.AUTH = {
    sb,
    getUser,
    getProfile,
    signOut,
    requireAuth,
    unreadNotificationCount,
    INCOGNITO_NAMES,
    pickRandomIncognito,
    pickRandomIncognitoWithNumber,
    ensureIncognitoName
  };

  // ────────── Inject auth-aware nav buttons ──────────
  // Guard against parallel renders (DOMContentLoaded + onAuthStateChange can race)
  let _navRenderToken = 0;

  // Synchronously reserve space in nav-actions the moment this script runs.
  // This prevents the layout shift ("shake") when the auth buttons render
  // a few milliseconds after the page paints.
  // Pre-rendered HTML for the two states — kept in sync with renderNavAuth
  const LOGGED_OUT_HTML = `
    <a href="login.html" class="btn btn-ghost btn-sm" style="padding:6px 12px;font-size:13px">Log in</a>
    <a href="signup.html" class="btn btn-primary btn-sm" style="padding:6px 12px;font-size:13px">Sign up</a>
  `;
  function loggedInHTML(unread) {
    const bell = unread > 0
      ? `<a href="account.html#notifications" title="${unread} new" style="position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;color:var(--ink);text-decoration:none">
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
           <span style="position:absolute;top:0;right:0;background:var(--rausch);color:#fff;font-size:10px;font-weight:700;border-radius:10px;min-width:16px;height:16px;display:flex;align-items:center;justify-content:center;padding:0 4px">${unread}</span>
         </a>`
      : `<a href="account.html#notifications" style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;color:var(--muted);text-decoration:none">
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
         </a>`;
    return `${bell}<a href="account.html" class="btn btn-ghost btn-sm" style="padding:6px 12px;font-size:13px">My account</a>`;
  }

  // Cache last-known auth state in localStorage so we can render the right
  // buttons synchronously on the next page load — no blink, no flash.
  const AUTH_CACHE_KEY = 'geosin-auth-state'; // 'in' | 'out'
  function getCachedState() {
    try { return localStorage.getItem(AUTH_CACHE_KEY); } catch { return null; }
  }
  function setCachedState(s) {
    try { localStorage.setItem(AUTH_CACHE_KEY, s); } catch {}
  }

  function ensureAuthPlaceholder() {
    const actions = document.getElementById('nav-actions');
    if (!actions) return null;
    let wrap = actions.querySelector('[data-auth-block]');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.setAttribute('data-auth-block', '');
      wrap.style.display = 'flex';
      wrap.style.alignItems = 'center';
      wrap.style.gap = '8px';
      wrap.style.minWidth = '180px';
      wrap.style.justifyContent = 'flex-end';
      // Insert BEFORE lang-toggle so the toggle stays anchored to the right.
      actions.insertBefore(wrap, actions.firstChild);
      // Render the cached state IMMEDIATELY — no blank flash.
      const cached = getCachedState();
      if (cached === 'in')      wrap.innerHTML = loggedInHTML(0);
      else                       wrap.innerHTML = LOGGED_OUT_HTML; // default
    }
    return wrap;
  }
  // Run immediately if DOM is parsed; otherwise the moment it is.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureAuthPlaceholder);
  } else {
    ensureAuthPlaceholder();
  }

  async function renderNavAuth() {
    const myToken = ++_navRenderToken;
    const wrap = ensureAuthPlaceholder();
    if (!wrap) return;

    const user = await getUser();
    if (myToken !== _navRenderToken) return;

    if (!user) {
      setCachedState('out');
      // Only update if content actually changes — avoids a flash on logged-out pages
      if (wrap.dataset.state !== 'out') {
        wrap.innerHTML = LOGGED_OUT_HTML;
        wrap.dataset.state = 'out';
      }
      return;
    }

    setCachedState('in');
    const unread = await unreadNotificationCount();
    if (myToken !== _navRenderToken) return;
    const newHtml = loggedInHTML(unread);
    // Only swap if it actually differs from what's there (e.g. unread count changed)
    if (wrap.dataset.state !== 'in' || wrap.dataset.unread !== String(unread)) {
      wrap.innerHTML = newHtml;
      wrap.dataset.state = 'in';
      wrap.dataset.unread = String(unread);
    }
  }

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderNavAuth);
  } else {
    renderNavAuth();
  }

  // Re-render when auth state changes (login/logout in another tab too).
  // Also clear caches so the next getUser/getProfile sees fresh data.
  sb.auth.onAuthStateChange(() => {
    clearAuthCache();
    renderNavAuth();
  });

  window.renderNavAuth = renderNavAuth;
})();

// ── Nav dropdowns ───────────────────────────────────────────────
// Shared "click to open" behaviour for the grouped menu items
// (Community ▾, Guides ▾). Kept in its own block so it always runs,
// even if the Supabase setup above bailed out. We use one listener on
// the whole document ("event delegation") instead of one per button —
// that way it works on every page and on items added later.
(function () {
  function closeAll(except) {
    document.querySelectorAll('.nav-dropdown.open').forEach(function (dd) {
      if (dd === except) return;
      dd.classList.remove('open');
      var t = dd.querySelector('.nav-dropdown-toggle');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  }

  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('.nav-dropdown-toggle');
    if (toggle) {
      var dd = toggle.closest('.nav-dropdown');
      var willOpen = !dd.classList.contains('open');
      closeAll(dd);                       // only one group open at a time
      dd.classList.toggle('open', willOpen);
      toggle.setAttribute('aria-expanded', String(willOpen));
      return;
    }
    // A click anywhere that isn't inside an open menu closes the menus.
    if (!e.target.closest('.nav-dropdown-menu')) closeAll(null);
  });

  // Esc closes any open dropdown.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll(null);
  });
})();
