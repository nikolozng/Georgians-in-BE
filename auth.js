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
    pickRandomIncognito
  };

  // ────────── Inject auth-aware nav buttons ──────────
  async function renderNavAuth() {
    const actions = document.getElementById('nav-actions');
    if (!actions) return;

    // Remove any previously-rendered auth block (so it survives re-renders)
    actions.querySelectorAll('[data-auth-block]').forEach(el => el.remove());

    const wrap = document.createElement('div');
    wrap.setAttribute('data-auth-block', '');
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '8px';
    wrap.style.marginLeft = '8px';

    const user = await getUser();
    if (!user) {
      wrap.innerHTML = `
        <a href="login.html" class="btn btn-ghost btn-sm" style="padding:6px 12px;font-size:13px">Log in</a>
        <a href="signup.html" class="btn btn-primary btn-sm" style="padding:6px 12px;font-size:13px">Sign up</a>
      `;
    } else {
      const unread = await unreadNotificationCount();
      const bell = unread > 0
        ? `<a href="account.html#notifications" title="${unread} new" style="position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;color:var(--ink);text-decoration:none">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
             <span style="position:absolute;top:0;right:0;background:var(--rausch);color:#fff;font-size:10px;font-weight:700;border-radius:10px;min-width:16px;height:16px;display:flex;align-items:center;justify-content:center;padding:0 4px">${unread}</span>
           </a>`
        : `<a href="account.html#notifications" style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;color:var(--muted);text-decoration:none">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
           </a>`;
      wrap.innerHTML = `
        ${bell}
        <a href="account.html" class="btn btn-ghost btn-sm" style="padding:6px 12px;font-size:13px">My account</a>
      `;
    }
    actions.appendChild(wrap);
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
