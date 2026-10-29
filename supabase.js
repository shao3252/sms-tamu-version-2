/* ============================================================
   Sms Tamu 💖 - supabase.js  (Supabase Cloud Sync Layer)
   - Holds project URL + publishable key
   - Pulls role/premium/verified from the `profiles` table
   - DATABASE WINS: changing your role to 'admin' in Supabase
     makes you admin in the app on next load.
   - 100% offline-safe: everything is wrapped in try/catch;
     if the SDK can't load (no internet), the app still works.
============================================================ */

const SUPABASE_URL = 'https://cysyujfjpvoqbfcymowc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_GoVQd6e5YNg0bF0MwbzmjQ_H6Qw6t0Q';

// ---------------- tiny local helpers (same storage namespace as app.js) ----------------
const SB_DB = {
  get(key, def) {
    try { const v = localStorage.getItem('st_' + key); return v !== null ? JSON.parse(v) : def; }
    catch (e) { return def; }
  },
  set(key, val) { localStorage.setItem('st_' + key, JSON.stringify(val)); }
};
const sbGetUsers = () => SB_DB.get('users', []);
const sbSaveUsers = u => SB_DB.set('users', u);
const sbSaveUser = (updated) => {
  const users = sbGetUsers();
  const i = users.findIndex(u => u.id === updated.id);
  if (i > -1) { users[i] = updated; sbSaveUsers(users); return true; }
  return false;
};

// ---------------- SDK loader (dynamic, offline-tolerant) ----------------
let _sdkPromise = null;
function sbLoadSdk() {
  if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
  if (_sdkPromise) return _sdkPromise;
  _sdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    s.async = true;
    s.onload = () => resolve(window.supabase);
    s.onerror = () => { _sdkPromise = null; reject(new Error('Supabase SDK unavailable (offline?)')); };
    document.head.appendChild(s);
  });
  return _sdkPromise;
}

let _client = null;
async function sbClient() {
  if (_client) return _client;
  const sdk = await sbLoadSdk();
  _client = sdk.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return _client;
}

// ---------------- Public API ----------------
const SupabaseSync = {
  /**
   * Fetch the profile row for this user from Supabase and apply
   * role / premium / verified / bio / pic / username locally.
   * Matching priority: email, then id.
   * Returns the updated local user object, or null if offline / no row.
   */
  async pullUser(localUser) {
    if (!localUser) return null;
    try {
      const sb = await sbClient();

      let { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('email', localUser.email)
        .maybeSingle();

      if (error) throw error;

      if (!data && localUser.id) {
        const r2 = await sb.from('profiles').select('*').eq('id', localUser.id).maybeSingle();
        data = r2.data;
        if (r2.error) throw r2.error;
      }

      if (!data) return null;

      const role = (data.role || '').toString().toLowerCase();
      const updated = Object.assign({}, localUser, {
        username: data.username || localUser.username,
        bio:      (data.bio != null) ? data.bio : localUser.bio,
        pic:      data.pic || data.avatar_url || localUser.pic,
        // --- DATABASE WINS on roles ---
        admin:    data.admin === true || data.is_admin === true || role === 'admin' || role === 'superadmin',
        premium:  data.premium === true || role === 'vip' || role === 'premium',
        verified: data.verified === true || role === 'admin' || role === 'superadmin'
      });

      sbSaveUser(updated);
      return updated;
    } catch (e) {
      console.warn('[SupabaseSync] pullUser failed (offline or RLS?):', e.message || e);
      return null;
    }
  },

  /**
   * Push a local user up to the profiles table (best-effort).
   * Used right after registration so your account exists in the DB.
   */
  async upsertProfile(user) {
    if (!user) return;
    try {
      const sb = await sbClient();
      const { error } = await sb.from('profiles').upsert({
        id:       user.id,
        email:    user.email,
        username: user.username,
        bio:      user.bio || '',
        role:     user.admin ? 'admin' : 'user',
        premium:  !!user.premium,
        verified: !!user.verified
      }, { onConflict: 'id' });
      if (error) throw error;
    } catch (e) {
      console.warn('[SupabaseSync] upsertProfile failed:', e.message || e);
    }
  },

  /** Fire-and-forget pull for the current session (used on page load). */
  async syncSession() {
    const id = SB_DB.get('session', null);
    if (!id) return;
    const u = sbGetUsers().find(x => x.id === id);
    if (!u) return;
    const synced = await this.pullUser(u);
    if (synced && window.currentUser && window.currentUser.id === synced.id) {
      window.currentUser = synced;
    }
  }
};
window.SupabaseSync = SupabaseSync;

// ---------------- Auto-sync on every page load ----------------
(function sbInit() {
  const run = () => SupabaseSync.syncSession();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  // keep roles fresh while the app stays open (DB wins over localStorage)
  setInterval(run, 5 * 60 * 1000);
})();