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
    auth: { persistSession: true, autoRefreshToken: true }
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
      await sb.from('profiles').update({ incognito_name: newName }).eq('id', user.id);
    } else {
      await sb.from('profiles').upsert({
        id: user.id,
        email: user.email,
        display_name: display,
        incognito_name: newName
      });
    }
    return newName;
  }

  // ────────── Helpers ──────────
  async function getUser() {
    const { data } = await sb.auth.getUser();
    return data?.user || null;
  }

  async function getProfile() {
    const u = await getUser();
    if (!u) return null;
    const { data } = await sb.from('profiles').select('*').eq('id', u.id).maybeSingle();
    return data || null;
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

  // Re-render when auth state changes (login/logout in another tab too)
  sb.auth.onAuthStateChange(() => renderNavAuth());

  window.renderNavAuth = renderNavAuth;
})();
