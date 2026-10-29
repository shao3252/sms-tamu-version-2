/* ============================================================
   Sms Tamu 💖 - app.js  (Main Application Logic)
   Works 100% offline with localStorage.
   Default admin account:  admin@smstamu.com / admin123
============================================================ */

// ---------------- Storage Layer ----------------
const DB = {
  get(key, def) {
    try { const v = localStorage.getItem('st_' + key); return v !== null ? JSON.parse(v) : def; }
    catch (e) { return def; }
  },
  set(key, val) { localStorage.setItem('st_' + key, JSON.stringify(val)); }
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const DEFAULT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ccc" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'sasa hivi';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' hrs ago';
  return Math.floor(s / 86400) + ' days ago';
}

// ---------------- Data Access ----------------
const getUsers = () => DB.get('users', []);
const saveUsers = u => DB.set('users', u);
const getPosts = () => DB.get('posts', []);
const savePosts = p => DB.set('posts', p);
const getUser = id => getUsers().find(u => u.id === id) || null;

function updateUser(updated) {
  const users = getUsers();
  const i = users.findIndex(u => u.id === updated.id);
  if (i > -1) { users[i] = updated; saveUsers(users); }
  if (currentUser && currentUser.id === updated.id) {
    currentUser = updated;
    window.currentUser = updated;
  }
}

// ---------------- Globals ----------------
let currentUser = null;
let viewingUserId = null;
let currentPostId = null;
let currentFeedFilter = 'All';
let profileTab = 'own';
window.currentUser = null;
window.viewingUserId = null;

// ---------------- i18n ----------------
const i18n = {
  sw: {
    welcomeSub: "Shiriki meseji tamu za mapenzi", regHeader: "Jisajili", regBtn: "Jisajili",
    haveAccount: "Tayari una akaunti?", loginHeader: "Ingia", loginBtn: "Ingia", noAccount: "Hauna akaunti?",
    catAll: "Yote", catApology: "Kuomba Msamaha", catPraise: "Kusifia", catSeductive: "Kuvutia", catOther: "Mengineyo",
    draftTitle: "Andika Meseji", catSelect: "Chagua Kundi...", sendApprovalBtn: "Tuma Ikaguliwe",
    followingText: "Following", followersText: "Followers", editProfileBtn: "Badili Wasifu",
    myPostsTab: "Posti Zangu", likedTab: "Zilizopendwa", savedTab: "Zilizohifadhiwa", postsTitle: "Posts",
    myReportsBtn: "Ripoti Zangu", navHome: "Nyumbani", navSearch: "Tafuta", navChat: "Chat", navProfile: "Wasifu",
    settingsTitle: "Mipangilio", toggleTheme: "🌓 Badili Muonekano", reportBugBtn: "🐞 Ripoti Tatizo",
    logoutBtn: "🚪 Toka (Logout)", closeBtn: "Funga"
  },
  en: {
    welcomeSub: "Share sweet love messages", regHeader: "Sign Up", regBtn: "Sign Up",
    haveAccount: "Already have an account?", loginHeader: "Login", loginBtn: "Login", noAccount: "No account?",
    catAll: "All", catApology: "Apology", catPraise: "Praise", catSeductive: "Seductive", catOther: "Other",
    draftTitle: "Write Message", catSelect: "Choose Category...", sendApprovalBtn: "Send for Approval",
    followingText: "Following", followersText: "Followers", editProfileBtn: "Edit Profile",
    myPostsTab: "My Posts", likedTab: "Liked", savedTab: "Saved", postsTitle: "Posts",
    myReportsBtn: "My Reports", navHome: "Home", navSearch: "Search", navChat: "Chat", navProfile: "Profile",
    settingsTitle: "Settings", toggleTheme: "🌓 Toggle Theme", reportBugBtn: "🐞 Report a Problem",
    logoutBtn: "🚪 Logout", closeBtn: "Close"
  }
};

function applyLang(lang) {
  const dict = i18n[lang] || i18n.sw;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (dict[k]) el.textContent = dict[k];
  });
  DB.set('lang', lang);
  const s1 = document.getElementById('settings-lang'); if (s1) s1.value = lang;
  const s2 = document.getElementById('auth-lang'); if (s2) s2.value = lang;
}

// ---------------- Toast ----------------
function toast(msg, type) {
  type = type || 'info';
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; }, 2500);
  setTimeout(() => t.remove(), 3000);
}
window.toast = toast;

// ---------------- UI ----------------
const ui = {
  showModal(id) { const m = document.getElementById(id); if (m) m.classList.add('active'); },
  hideModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('active'); },
  toggleTheme() {
    document.body.classList.toggle('dark');
    DB.set('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  }
};
window.ui = ui;

// ---------------- Seed Data ----------------
function seed() {
  if (DB.get('seeded_v1', false)) return;
  const adminId = uid();
  const u2 = uid(), u3 = uid();
  saveUsers([
    { id: adminId, username: 'Admin', email: 'admin@smstamu.com', pass: 'admin123',
      bio: 'Msimamizi wa Sms Tamu 💖', pic: '', verified: true, premium: true, admin: true,
      blocked: false, blockedUsers: [], following: [], joined: Date.now() },
    { id: u2, username: 'Neema', email: 'neema@demo.com', pass: 'demo123',
      bio: 'Napenda mapenzi 🌹', pic: '', verified: true, premium: false, admin: false,
      blocked: false, blockedUsers: [], following: [], joined: Date.now() - 86400000 },
    { id: u3, username: 'Baraka', email: 'baraka@demo.com', pass: 'demo123',
      bio: 'Mwana maana ❤️', pic: '', verified: false, premium: false, admin: false,
      blocked: false, blockedUsers: [], following: [], joined: Date.now() - 172800000 }
  ]);
  savePosts([
    { id: uid(), text: "Samahani mpenzi wangu, nakiri kuwa nilikosea. Moyo wangu unakutafuta kila siku. Tafadhali nisamehe. 🙏", category: "Apology messages", authorId: u2, time: Date.now() - 3600000, likes: [], savedBy: [], status: 'approved', comments: [] },
    { id: uid(), text: "Uko kama jua linalochomoza asubuhi – unang'aza maisha yangu yote. Nakupenda! ☀️❤️", category: "Messages of praise", authorId: u3, time: Date.now() - 7200000, likes: [], savedBy: [], status: 'approved', comments: [] },
    { id: uid(), text: "Kila kona ya mwili wangu inakutamania usiku huu. Njoo ujionee mwenyewe... 😘🔥", category: "Seductive Messages", authorId: u2, time: Date.now() - 10800000, likes: [], savedBy: [], status: 'approved', comments: [] },
    { id: uid(), text: "Penzi ni kama chai – hutamu zaidi unapokunywa kwa utulivu. ☕💕", category: "Other", authorId: u3, time: Date.now() - 14400000, likes: [], savedBy: [], status: 'approved', comments: [] }
  ]);
  DB.set('vipPosts', [
    { id: uid(), text: "🌟 Mpenzi, leo usiku nimekupaka mafuta ya mapenzi... subiri tu. Ujumbe mpya wa Kuntu kila Jumatatu! 🔥", authorId: adminId, time: Date.now() - 7200000, likes: [] },
    { id: uid(), text: "🌟 Nakufikiria ukiwa hujavaa kitu chochote... 😈 Njoo ujifunze zaidi ukiwa ndani.", authorId: adminId, time: Date.now() - 3600000, likes: [] }
  ]);
  DB.set('announcements', [{ id: uid(), text: "🎉 Karibu Sms Tamu! Tumia kanuni za heshima kwenye group chat. 💖", time: Date.now() }]);
  DB.set('paysettings', { method: 'M-Pesa / Tigo Pesa', number: '255799178372', name: 'SMS TAMU VIP', amount: '5000 TZS / mwezi' });
  DB.set('chat', { groupName: '🌍 Global Group', groupPic: '', locked: false, admins: [adminId], messages: [] });
  DB.set('autoapprove', false);
  DB.set('reports', []);
  DB.set('appeals', []);
  DB.set('premiumReq', []);
  DB.set('seeded_v1', true);
}

// ---------------- Auth ----------------
const appAuth = {
  toggleAuth() {
    const r = document.getElementById('register-form');
    const l = document.getElementById('login-form');
    const showingReg = r.style.display !== 'none';
    r.style.display = showingReg ? 'none' : 'block';
    l.style.display = showingReg ? 'block' : 'none';
  },
  register() {
    const username = document.getElementById('reg-user').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const pass = document.getElementById('reg-pass').value;
    if (!username || !email || !pass) return toast('Jaza taarifa zote kwanza!', 'error');
    if (pass.length < 4) return toast('Password ni fupi sana (min 4)', 'error');
    const users = getUsers();
    if (users.some(u => u.email === email)) return toast('Email hii tayari imesajiliwa!', 'error');
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) return toast('Jina hili limeshachukuliwa!', 'error');
    const nu = { id: uid(), username, email, pass, bio: '', pic: '', verified: false,
      premium: false, admin: false, blocked: false, blockedUsers: [], following: [], joined: Date.now() };
    users.push(nu); saveUsers(users);
    DB.set('session', nu.id);
    if (window.SupabaseSync) SupabaseSync.upsertProfile(nu);
    toast('Karibu Sms Tamu, ' + username + '! 💖', 'success');
    enterApp();
  },
  login() {
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-pass').value;
    const u = getUsers().find(x => x.email === email && x.pass === pass);
    if (!u) return toast('Email au Password si sahihi!', 'error');
    if (u.blocked) return toast('Akaunti yako imefungwa. Tuma ombi la kufunguliwa kwenye Mipangilio.', 'error');
    DB.set('session', u.id);
    if (window.SupabaseSync) SupabaseSync.pullUser(u);
    toast('Karibu tena, ' + u.username + '! 👋', 'success');
    enterApp();
  },
  logout() {
    DB.set('session', null);
    location.reload();
  }
};
window.appAuth = appAuth;

// ---------------- Router ----------------
const NAV_MAP = { home: 0, search: 1, create: 2, chat: 3, profile: 4 };
const router = {
  navigate(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + view);
    if (target) target.classList.add('active');
    document.querySelectorAll('.bottom-nav .nav-item').forEach(n => n.classList.remove('active'));
    const idx = NAV_MAP[view];
    const navs = document.querySelectorAll('.bottom-nav .nav-item');
    if (idx != null && navs[idx]) navs[idx].classList.add('active');
    if (view === 'home') renderFeed(currentFeedFilter);
    if (view === 'profile') { updateProfileUI(); loadProfilePosts(profileTab); }
    if (view === 'search') appFeatures.search();
    if (view === 'admin') appAdmin.refreshAutoStatus();
    if (view === 'my-reports') renderMyReports();
    window.scrollTo(0, 0);
  }
};
window.router = router;

// ---------------- Feed ----------------
function canSee(p) {
  if (!currentUser) return false;
  if (currentUser.admin) return true;
  if (p.authorId === currentUser.id) return true;
  if (p.status !== 'approved') return false;
  if ((currentUser.blockedUsers || []).includes(p.authorId)) return false;
  const author = getUser(p.authorId);
  if (author && (author.blockedUsers || []).includes(currentUser.id)) return false;
  return true;
}

function postCard(p) {
  const author = getUser(p.authorId) || { username: 'Unknown' };
  const isAdmin = currentUser && currentUser.admin;
  const isOwner = currentUser && p.authorId === currentUser.id;
  const liked = currentUser && p.likes.includes(currentUser.id);
  const saved = currentUser && p.savedBy.includes(currentUser.id);
  const badge = p.category === 'Message Kuntu'
    ? '<span class="post-cat-badge" style="color:#d4af37;border-color:#d4af37;font-weight:bold;">🌟 VIP</span>'
    : '<span class="post-cat-badge">' + esc(p.category) + '</span>';
  const status = (p.status === 'pending' && (isOwner || isAdmin))
    ? '<span class="post-status">⏳ Pending</span>' : '';
  const delBtn = (isOwner || isAdmin)
    ? '<button class="action-btn" onclick="appFeatures.deletePost(\'' + p.id + '\')">🗑️</button>' : '';
  const reportBtn = (currentUser && !isOwner)
    ? '<button class="action-btn" onclick="appFeatures.reportPost(\'' + p.id + '\')">🚩</button>' : '';
  return '<div class="card">' +
    '<div class="post-header" onclick="appFeatures.viewProfile(\'' + p.authorId + '\')">' +
      '<img src="' + (author.pic || DEFAULT_AVATAR) + '" class="avatar">' +
      '<div class="post-meta">' +
        '<div class="post-author">' + esc(author.username) +
          (author.verified ? '<span class="verified-badge">✓</span>' : '') +
          (author.premium ? '<span style="color:#d4af37;">🌟</span>' : '') + badge + '</div>' +
        '<div class="post-time">' + timeAgo(p.time) + ' ' + status + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="post-text">' + esc(p.text) + '</div>' +
    '<div class="post-actions">' +
      '<button class="action-btn' + (liked ? ' active' : '') + '" onclick="appFeatures.toggleLike(\'' + p.id + '\')">❤️ <span>' + p.likes.length + '</span></button>' +
      '<button class="action-btn" onclick="appFeatures.openComments(\'' + p.id + '\')">💬 <span>' + p.comments.length + '</span></button>' +
      '<button class="action-btn' + (saved ? ' active' : '') + '" onclick="appFeatures.toggleSave(\'' + p.id + '\')">🔖</button>' +
      '<button class="action-btn" onclick="appFeatures.copyText(\'' + p.id + '\')">📋</button>' +
      reportBtn + delBtn +
    '</div></div>';
}

function renderFeed(filter) {
  currentFeedFilter = filter || currentFeedFilter;
  const cont = document.getElementById('feed-container');
  if (!cont) return;
  document.querySelectorAll('#feed-categories .cat-pill').forEach(b => b.classList.remove('active'));
  const pills = document.querySelectorAll('#feed-categories .cat-pill');
  const map = { All: 0 };
  pills.forEach((b, i) => { if (b.textContent.toLowerCase().includes(currentFeedFilter.toLowerCase().slice(0, 5))) b.classList.add('active'); });
  if (pills[0]) pills[0].classList.toggle('active', currentFeedFilter === 'All');

  let posts = getPosts().filter(canSee);
  if (currentFeedFilter !== 'All') posts = posts.filter(p => p.category === currentFeedFilter);
  posts.sort((a, b) => b.time - a.time);
  cont.innerHTML = posts.length
    ? posts.map(postCard).join('')
    : '<p style="text-align:center;color:var(--text-muted);padding:30px;">Hakuna posts bado kwenye kundi hili. 🌸</p>';
}

// ---------------- Features ----------------
const appFeatures = {
  changeLang(v) { applyLang(v); renderFeed(currentFeedFilter); },

  filterFeed(cat) { renderFeed(cat); },

  createPost() {
    const cat = document.getElementById('post-category').value;
    const text = document.getElementById('post-text').value.trim();
    if (!cat) return toast('Chagua kundi la ujumbe kwanza!', 'error');
    if (!text) return toast('Andika ujumbe kwanza!', 'error');
    if (cat === 'Message Kuntu' && !(currentUser.premium || currentUser.admin))
      return toast('Kundi hili ni kwa wanachama wa VIP tu! 🌟', 'error');
    const status = (currentUser.admin || DB.get('autoapprove', false)) ? 'approved' : 'pending';
    const posts = getPosts();
    posts.push({ id: uid(), text, category: cat, authorId: currentUser.id,
      time: Date.now(), likes: [], savedBy: [], status, comments: [] });
    savePosts(posts);
    document.getElementById('post-text').value = '';
    document.getElementById('post-category').selectedIndex = 0;
    toast(status === 'approved' ? 'Imechapishwa! 🎉' : 'Imetumwa, inasubiri idhini ya Admin. ⏳', 'success');
    router.navigate('home');
  },

  toggleLike(id) {
    const posts = getPosts(); const p = posts.find(x => x.id === id);
    if (!p) return;
    const i = p.likes.indexOf(currentUser.id);
    if (i > -1) p.likes.splice(i, 1); else p.likes.push(currentUser.id);
    savePosts(posts); refreshCurrentView();
  },

  toggleSave(id) {
    const posts = getPosts(); const p = posts.find(x => x.id === id);
    if (!p) return;
    const i = p.savedBy.indexOf(currentUser.id);
    if (i > -1) p.savedBy.splice(i, 1); else p.savedBy.push(currentUser.id);
    savePosts(posts);
    toast(i > -1 ? 'Imeondolewa kwenye zilizohifadhiwa' : 'Imehifadhiwa! 🔖', 'success');
    refreshCurrentView();
  },

  copyText(id) {
    const p = getPosts().find(x => x.id === id);
    if (!p) return;
    const done = () => toast('Imenakiliwa! 📋', 'success');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(p.text).then(done).catch(() => fallbackCopy(p.text, done));
    } else fallbackCopy(p.text, done);
  },

  deletePost(id) {
    if (!confirm('Futa post hii kabisa?')) return;
    savePosts(getPosts().filter(p => p.id !== id));
    toast('Post imefutwa.', 'success');
    refreshCurrentView();
  },

  reportPost(id) {
    const reason = prompt('Eleza tatizo kwenye post hii:');
    if (!reason) return;
    const reports = DB.get('reports', []);
    reports.unshift({ id: uid(), userId: currentUser.id, postId: id, text: reason, time: Date.now(), resolved: false });
    DB.set('reports', reports);
    toast('Ripoti imetumwa. Asante! 🙏', 'success');
  },

  openComments(id) {
    currentPostId = id;
    renderComments();
    ui.showModal('comment-modal');
  },

  addComment() {
    const inp = document.getElementById('comment-input');
    const text = inp.value.trim();
    if (!text) return;
    const posts = getPosts(); const p = posts.find(x => x.id === currentPostId);
    if (!p) return;
    p.comments.push({ id: uid(), userId: currentUser.id, text, time: Date.now() });
    savePosts(posts);
    inp.value = '';
    renderComments(); refreshCurrentView();
  },

  // ---------- Profile ----------
  viewProfile(userId) {
    if (userId === currentUser.id) return router.navigate('profile');
    viewingUserId = userId; window.viewingUserId = userId;
    renderOtherProfile();
    router.navigate('other-profile');
  },

  toggleFollow() {
    if (!viewingUserId) return;
    const me = Object.assign({}, currentUser);
    const target = getUser(viewingUserId);
    if (!target) return;
    const i = me.following.indexOf(viewingUserId);
    if (i > -1) { me.following.splice(i, 1); toast('Umeacha kumfuatia ' + target.username, 'info'); }
    else { me.following.push(viewingUserId); toast('Unamfuatia ' + target.username + ' ❤️', 'success'); }
    updateUser(me);
    renderOtherProfile();
  },

  toggleBlockUser() {
    const target = getUser(viewingUserId);
    if (!target) return;
    const me = Object.assign({}, currentUser);
    const i = me.blockedUsers.indexOf(viewingUserId);
    if (i > -1) { me.blockedUsers.splice(i, 1); toast('Umemwondolea block.', 'info'); }
    else { me.blockedUsers.push(viewingUserId); toast('Ameblockiwa. Hutaona posts zake tena.', 'success'); }
    updateUser(me);
    renderOtherProfile();
  },

  showFollowingList(userId) {
    const owner = getUser(userId);
    if (!owner) return;
    const list = document.getElementById('following-list');
    if (!owner.following.length) {
      list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">Hafuati mtu yeyote bado.</p>';
    } else {
      list.innerHTML = owner.following.map(fid => {
        const f = getUser(fid);
        if (!f) return '';
        const isMe = f.id === currentUser.id;
        const amFollowing = currentUser.following.includes(f.id);
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--border);">' +
          '<img src="' + (f.pic || DEFAULT_AVATAR) + '" class="avatar" style="width:36px;height:36px;" ' +
            'onclick="ui.hideModal(\'following-modal\');appFeatures.viewProfile(\'' + f.id + '\')" >' +
          '<div style="flex:1;cursor:pointer;" onclick="ui.hideModal(\'following-modal\');appFeatures.viewProfile(\'' + f.id + '\')">' +
            '<strong>' + esc(f.username) + '</strong>' + (f.verified ? ' <span class="verified-badge">✓</span>' : '') + '</div>' +
          (isMe ? '' : '<button class="btn-outline" style="padding:5px 12px;font-size:0.8rem;" onclick="appFeatures.followFromList(\'' + f.id + '\')">' +
            (amFollowing ? 'Unfollow' : 'Follow') + '</button>') +
        '</div>';
      }).join('');
    }
    ui.showModal('following-modal');
  },

  followFromList(userId) {
    const me = Object.assign({}, currentUser);
    const i = me.following.indexOf(userId);
    if (i > -1) me.following.splice(i, 1); else me.following.push(userId);
    updateUser(me);
    appFeatures.showFollowingList(currentUser.id === viewingUserId && document.getElementById('view-other-profile').classList.contains('active') ? viewingUserId : currentUser.id);
    if (document.getElementById('view-other-profile').classList.contains('active')) renderOtherProfile();
  },

  updateProfilePic(e) {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => {
      const me = Object.assign({}, currentUser, { pic: ev.target.result });
      updateUser(me);
      updateProfileUI();
      toast('Picha ya wasifu imebadilishwa! 📷', 'success');
    };
    r.readAsDataURL(file);
    e.target.value = '';
  },

  saveProfile() {
    const username = document.getElementById('edit-user').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();
    if (!username) return toast('Jina halitoshi!', 'error');
    const me = Object.assign({}, currentUser, { username, bio });
    updateUser(me);
    updateProfileUI();
    ui.hideModal('edit-profile-modal');
    toast('Wasifu umehifadhiwa! ✅', 'success');
  },

  loadProfilePosts(type) {
    profileTab = type;
    document.querySelectorAll('.profile-tabs .tab').forEach(t => t.classList.remove('active'));
    const tabs = document.querySelectorAll('.profile-tabs .tab');
    if (type === 'own' && tabs[0]) tabs[0].classList.add('active');
    if (type === 'liked' && tabs[1]) tabs[1].classList.add('active');
    if (type === 'saved' && tabs[2]) tabs[2].classList.add('active');
    const cont = document.getElementById('profile-posts-container');
    let posts = [];
    if (type === 'own') posts = getPosts().filter(p => p.authorId === currentUser.id);
    if (type === 'liked') posts = getPosts().filter(p => p.likes.includes(currentUser.id));
    if (type === 'saved') posts = getPosts().filter(p => p.savedBy.includes(currentUser.id));
    posts.sort((a, b) => b.time - a.time);
    cont.innerHTML = posts.length ? posts.map(postCard).join('')
      : '<p style="text-align:center;color:var(--text-muted);padding:30px;">Hakuna posts hapa bado. 🌸</p>';
  },

  search() {
    const q = (document.getElementById('search-input').value || '').toLowerCase().trim();
    const cont = document.getElementById('search-results');
    if (!q) { cont.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:30px;">Tafuta posts au watumiaji... 🔍</p>'; return; }
    const users = getUsers().filter(u => u.id !== currentUser.id && !currentUser.blockedUsers.includes(u.id) &&
      u.username.toLowerCase().includes(q));
    const posts = getPosts().filter(p => p.status === 'approved' && !currentUser.blockedUsers.includes(p.authorId) &&
      p.text.toLowerCase().includes(q));
    let html = '';
    if (users.length) {
      html += '<h3 style="margin:10px 0;color:var(--text-muted);">Watumiaji</h3>' + users.map(u =>
        '<div class="card" style="display:flex;align-items:center;gap:12px;cursor:pointer;" onclick="appFeatures.viewProfile(\'' + u.id + '\')">' +
          '<img src="' + (u.pic || DEFAULT_AVATAR) + '" class="avatar">' +
          '<div><strong>' + esc(u.username) + '</strong>' + (u.verified ? ' <span class="verified-badge">✓</span>' : '') +
          (u.premium ? ' <span style="color:#d4af37;">🌟</span>' : '') +
          '<div style="font-size:0.85rem;color:var(--text-muted);">' + esc(u.bio || '') + '</div></div></div>').join('');
    }
    if (posts.length) {
      html += '<h3 style="margin:10px 0;color:var(--text-muted);">Posts</h3>' + posts.sort((a, b) => b.time - a.time).map(postCard).join('');
    }
    cont.innerHTML = html || '<p style="text-align:center;color:var(--text-muted);padding:30px;">Hakuna matokeo ya "' + esc(q) + '"</p>';
  },

  openSettings() {
    document.getElementById('btn-appeal').style.display = currentUser.blocked ? 'block' : 'none';
    ui.showModal('settings-modal');
  },

  submitReport() {
    const text = document.getElementById('bug-text').value.trim();
    if (!text) return toast('Eleza tatizo kwanza!', 'error');
    const reports = DB.get('reports', []);
    reports.unshift({ id: uid(), userId: currentUser.id, text, time: Date.now(), resolved: false });
    DB.set('reports', reports);
    document.getElementById('bug-text').value = '';
    ui.hideModal('bug-modal');
    toast('Ripoti imetumwa. Tutalifanyia kazi hivi punde! 🐞', 'success');
  },

  submitAppeal() {
    const text = document.getElementById('appeal-text').value.trim();
    if (!text) return toast('Andika ombi lako kwanza!', 'error');
    const appeals = DB.get('appeals', []);
    appeals.unshift({ id: uid(), userId: currentUser.id, text, time: Date.now(), resolved: false });
    DB.set('appeals', appeals);
    document.getElementById('appeal-text').value = '';
    ui.hideModal('appeal-modal');
    toast('Ombi lako limetumwa. Admin atakagua hivi punde. ⚖️', 'success');
  }
};
window.appFeatures = appFeatures;

function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('Imeshindikana kunakili', 'error'); }
  ta.remove();
}

function refreshCurrentView() {
  const views = ['home', 'profile', 'other-profile', 'search'];
  for (const v of views) {
    if (document.getElementById('view-' + v) && document.getElementById('view-' + v).classList.contains('active')) {
      if (v === 'home') renderFeed(currentFeedFilter);
      if (v === 'profile') { updateProfileUI(); appFeatures.loadProfilePosts(profileTab); }
      if (v === 'other-profile') renderOtherProfile();
      if (v === 'search') appFeatures.search();
      return;
    }
  }
}

// ---------------- Comments ----------------
function renderComments() {
  const p = getPosts().find(x => x.id === currentPostId);
  const list = document.getElementById('comments-list');
  if (!p) { list.innerHTML = ''; return; }
  list.innerHTML = p.comments.length ? p.comments.map(c => {
    const u = getUser(c.userId) || { username: 'Unknown' };
    return '<div style="display:flex;gap:10px;margin-bottom:15px;">' +
      '<img src="' + (u.pic || DEFAULT_AVATAR) + '" class="avatar" style="width:32px;height:32px;">' +
      '<div style="background:var(--bg-color);padding:8px 12px;border-radius:12px;flex:1;">' +
        '<strong style="font-size:0.85rem;">' + esc(u.username) + '</strong> ' +
        '<small style="color:var(--text-muted);">' + timeAgo(c.time) + '</small>' +
        '<div style="margin-top:3px;">' + esc(c.text) + '</div></div></div>';
  }).join('') : '<p style="text-align:center;color:var(--text-muted);padding:20px;">Hakuna comments bado. Kuwa wa kwanza! 💬</p>';
}

// ---------------- Profile UI ----------------
function updateProfileUI() {
  if (!currentUser) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const pic = document.getElementById('my-prof-pic');
  if (pic) pic.src = currentUser.pic || DEFAULT_AVATAR;
  set('my-username', currentUser.username);
  set('my-verified', currentUser.verified ? '✓' : '');
  const vp = document.getElementById('my-verified');
  if (vp) vp.className = currentUser.verified ? 'verified-badge' : '';
  const vprem = document.getElementById('my-premium');
  if (vprem) vprem.textContent = currentUser.premium ? '🌟 VIP' : '';
  set('my-bio', currentUser.bio || 'No bio yet.');
  set('my-following', currentUser.following.length);
  set('my-followers', getUsers().filter(u => u.following.includes(currentUser.id)).length);
  document.getElementById('admin-btn').style.display = currentUser.admin ? 'block' : 'none';
  const optPrem = document.getElementById('opt-premium');
  if (optPrem) optPrem.style.display = (currentUser.premium || currentUser.admin) ? 'block' : 'none';
}

function renderOtherProfile() {
  const u = getUser(viewingUserId);
  if (!u) return;
  const pic = document.getElementById('other-prof-pic');
  if (pic) pic.src = u.pic || DEFAULT_AVATAR;
  document.getElementById('other-username').textContent = u.username;
  const v = document.getElementById('other-verified');
  v.textContent = u.verified ? '✓' : '';
  v.className = u.verified ? 'verified-badge' : '';
  const pr = document.getElementById('other-premium');
  pr.textContent = u.premium ? '🌟 VIP' : '';
  document.getElementById('other-bio').textContent = u.bio || 'No bio yet.';
  document.getElementById('other-following').textContent = u.following.length;
  document.getElementById('other-followers').textContent = getUsers().filter(x => x.following.includes(u.id)).length;
  const fbtn = document.getElementById('follow-btn');
  const amFollowing = currentUser.following.includes(u.id);
  fbtn.textContent = amFollowing ? 'Unfollow' : 'Follow';
  const bbtn = document.getElementById('user-block-btn');
  const isBlocked = currentUser.blockedUsers.includes(u.id);
  bbtn.textContent = isBlocked ? '✅ Unblock' : '🚫 Block';
  const posts = getPosts().filter(p => p.authorId === u.id && (p.status === 'approved' || currentUser.admin))
    .sort((a, b) => b.time - a.time);
  document.getElementById('other-profile-posts').innerHTML = posts.length
    ? posts.map(postCard).join('')
    : '<p style="text-align:center;color:var(--text-muted);padding:30px;">Hakuna posts bado. 🌸</p>';
}

function renderMyReports() {
  const mine = DB.get('reports', []).filter(r => r.userId === currentUser.id);
  document.getElementById('my-reports-list').innerHTML = mine.length ? mine.map(r =>
    '<div class="card"><div style="display:flex;justify-content:space-between;margin-bottom:8px;">' +
    '<strong>🐞 ' + timeAgo(r.time) + '</strong>' +
    '<span class="post-status" style="background:' + (r.resolved ? '#d4edda;color:#155724' : '#fff3cd;color:#856404') + ';">' +
    (r.resolved ? '✅ Resolved' : '⏳ Inasubiri') + '</span></div>' +
    '<p style="font-size:0.95rem;">' + esc(r.text) + '</p></div>').join('')
    : '<p style="text-align:center;color:var(--text-muted);padding:30px;">Hakuna ripoti zako bado.</p>';
}

// ---------------- Announcements ----------------
function loadAnnouncements() {
  const anns = DB.get('announcements', []);
  const bar = document.getElementById('announcement-bar');
  const mc = document.getElementById('announcement-marquee');
  if (!bar || !mc) return;
  if (anns.length) {
    mc.textContent = anns.map(a => a.text).join('   •   ');
    bar.style.display = 'flex';
  } else bar.style.display = 'none';
}

// ---------------- Chat Badge ----------------
function updateChatBadge() {
  if (!currentUser) return;
  const chat = DB.get('chat', { messages: [] });
  const lastSeen = DB.get('lastseen_' + currentUser.id, 0);
  const count = chat.messages.filter(m => m.time > lastSeen && m.userId !== currentUser.id).length;
  const badge = document.getElementById('chat-badge');
  if (badge) {
    badge.style.display = count > 0 ? 'inline-block' : 'none';
    badge.textContent = count;
  }
}

// ---------------- Admin ----------------
const appAdmin = {
  refreshAutoStatus() {
    const el = document.getElementById('auto-app-status-text');
    if (el) { el.textContent = DB.get('autoapprove', false) ? 'ON' : 'OFF'; el.style.color = DB.get('autoapprove', false) ? 'var(--success)' : 'var(--danger)'; }
  },
  toggleAutoApprove() {
    DB.set('autoapprove', !DB.get('autoapprove', false));
    appAdmin.refreshAutoStatus();
    toast('Auto Approve: ' + (DB.get('autoapprove') ? 'IMEWASHWA' : 'IMEZIMWA'), 'success');
  },

  renderPending() {
    const area = document.getElementById('admin-content-area');
    const pending = getPosts().filter(p => p.status === 'pending');
    area.innerHTML = '<h4 style="margin-bottom:10px;">⏳ Pending Queue (' + pending.length + ')</h4>' + (pending.length ? pending.map(p => {
      const a = getUser(p.authorId) || { username: '?' };
      return '<div style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px;">' +
        '<strong>' + esc(a.username) + '</strong> <span class="post-cat-badge">' + esc(p.category) + '</span>' +
        '<p style="margin:6px 0;font-size:0.9rem;">' + esc(p.text.slice(0, 120)) + (p.text.length > 120 ? '...' : '') + '</p>' +
        '<div style="display:flex;gap:8px;">' +
        '<button class="btn-outline" style="flex:1;border-color:var(--success);color:var(--success);" onclick="appAdmin.approvePost(\'' + p.id + '\')">✅ Approve</button>' +
        '<button class="btn-outline" style="flex:1;border-color:var(--danger);color:var(--danger);" onclick="appAdmin.rejectPost(\'' + p.id + '\')">❌ Reject</button>' +
        '</div></div>';
    }).join('') : '<p style="color:var(--text-muted);">Hakuna posts zinazosubiri.</p>');
  },
  approvePost(id) {
    const posts = getPosts(); const p = posts.find(x => x.id === id);
    if (p) { p.status = 'approved'; savePosts(posts); toast('Post imeidhinishwa! ✅', 'success'); }
    appAdmin.renderPending();
  },
  rejectPost(id) {
    savePosts(getPosts().filter(p => p.id !== id));
    toast('Post imekataliwa na kufutwa.', 'info');
    appAdmin.renderPending();
  },

  renderUsers() {
    const area = document.getElementById('admin-content-area');
    area.innerHTML = '<h4 style="margin-bottom:10px;">👥 Users (' + getUsers().length + ')</h4>' + getUsers().map(u =>
      '<div style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px;">' +
        '<strong>' + esc(u.username) + '</strong> ' + (u.verified ? '✓' : '') + (u.premium ? '🌟' : '') + (u.admin ? '👑' : '') + (u.blocked ? '🔒' : '') +
        '<div style="font-size:0.8rem;color:var(--text-muted);">' + esc(u.email) + '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">' +
        '<button class="btn-outline" style="padding:5px 10px;font-size:0.75rem;" onclick="appAdmin.verifyUser(\'' + u.id + '\')">' + (u.verified ? '❌ Unverify' : '✅ Verify') + '</button>' +
        '<button class="btn-outline" style="padding:5px 10px;font-size:0.75rem;" onclick="appAdmin.toggleAdmin(\'' + u.id + '\')">' + (u.admin ? '⬇️ Toa Admin' : '👑 Fanya Admin') + '</button>' +
        '<button class="btn-outline" style="padding:5px 10px;font-size:0.75rem;" onclick="appAdmin.togglePremium(\'' + u.id + '\')">' + (u.premium ? '⭐ Toa VIP' : '🌟 Pa VIP') + '</button>' +
        '<button class="btn-outline" style="padding:5px 10px;font-size:0.75rem;color:' + (u.blocked ? 'var(--success)' : 'var(--danger)') + ';" onclick="appAdmin.toggleBlock(\'' + u.id + '\')">' + (u.blocked ? '🔓 Fungua' : '🔒 Fungia') + '</button>' +
        (u.id === currentUser.id ? '' : '<button class="btn-outline" style="padding:5px 10px;font-size:0.75rem;color:var(--danger);" onclick="appAdmin.deleteUser(\'' + u.id + '\')">🗑️ Futa</button>') +
        '</div></div>').join('');
  },
  verifyUser(id) { const u = getUser(id); if (u) { u.verified = !u.verified; updateUser(u); } appAdmin.renderUsers(); },
  toggleAdmin(id) { const u = getUser(id); if (u) { u.admin = !u.admin; updateUser(u); } appAdmin.renderUsers(); },
  togglePremium(id) { const u = getUser(id); if (u) { u.premium = !u.premium; updateUser(u); toast(u.username + (u.premium ? ' sasa ni VIP! 🌟' : ' ameondolewa VIP.'), 'success'); } appAdmin.renderUsers(); },
  toggleBlock(id) {
    const u = getUser(id); if (!u) return;
    u.blocked = !u.blocked; updateUser(u);
    toast(u.username + (u.blocked ? ' amefungiwa.' : ' amefunguliwa.'), u.blocked ? 'error' : 'success');
    appAdmin.renderUsers();
  },
  deleteUser(id) {
    if (!confirm('Futa user huyu kabisa? Posts zake pia zitafutwa!')) return;
    saveUsers(getUsers().filter(u => u.id !== id));
    savePosts(getPosts().filter(p => p.authorId !== id));
    toast('User amefutwa.', 'success');
    appAdmin.renderUsers();
  },

  renderPremiumReq() {
    const area = document.getElementById('admin-content-area');
    const reqs = DB.get('premiumReq', []);
    area.innerHTML = '<h4 style="margin-bottom:10px;color:#d4af37;">🌟 VIP Requests (' + reqs.length + ')</h4>' + (reqs.length ? reqs.map(r => {
      const u = getUser(r.userId);
      return '<div style="border:1px solid #d4af37;border-radius:10px;padding:10px;margin-bottom:10px;">' +
        '<strong>' + esc(u ? u.username : 'Unknown') + '</strong>' +
        '<div style="font-size:0.85rem;color:var(--text-muted);margin:4px 0;">Muamala: <strong>' + esc(r.transName) + '</strong> • ' + timeAgo(r.time) + '</div>' +
        (r.status === 'pending'
          ? '<div style="display:flex;gap:8px;">' +
            '<button class="btn-outline" style="flex:1;border-color:var(--success);color:var(--success);" onclick="appAdmin.approvePremium(\'' + r.id + '\')">✅ Thibitisha VIP</button>' +
            '<button class="btn-outline" style="flex:1;border-color:var(--danger);color:var(--danger);" onclick="appAdmin.rejectPremium(\'' + r.id + '\')">❌ Kataa</button></div>'
          : '<span class="post-status" style="background:' + (r.status === 'approved' ? '#d4edda;color:#155724' : '#f8d7da;color:#721c24') + ';">' + r.status.toUpperCase() + '</span>') +
        '</div>';
    }).join('') : '<p style="color:var(--text-muted);">Hakuna maombi ya VIP.</p>');
  },
  approvePremium(id) {
    const reqs = DB.get('premiumReq', []);
    const r = reqs.find(x => x.id === id);
    if (r) { r.status = 'approved'; DB.set('premiumReq', reqs); const u = getUser(r.userId); if (u) { u.premium = true; updateUser(u); } }
    toast('VIP imethibitishwa! 🌟', 'success');
    appAdmin.renderPremiumReq();
  },
  rejectPremium(id) {
    const reqs = DB.get('premiumReq', []);
    const r = reqs.find(x => x.id === id);
    if (r) { r.status = 'rejected'; DB.set('premiumReq', reqs); }
    appAdmin.renderPremiumReq();
  },

  renderPaymentSettings() {
    const ps = DB.get('paysettings', {});
    const area = document.getElementById('admin-content-area');
    area.innerHTML = '<h4 style="margin-bottom:10px;color:var(--success);">💳 Payment Settings</h4>' +
      '<label style="font-size:0.85rem;font-weight:bold;">Njia ya Malipo:</label>' +
      '<input type="text" id="ps-method" value="' + esc(ps.method || '') + '" placeholder="Mf. M-Pesa / Tigo Pesa">' +
      '<label style="font-size:0.85rem;font-weight:bold;">Namba ya Malipo:</label>' +
      '<input type="text" id="ps-number" value="' + esc(ps.number || '') + '" placeholder="Mf. 2557xxxxxxxx">' +
      '<label style="font-size:0.85rem;font-weight:bold;">Jina la Mpokeaji:</label>' +
      '<input type="text" id="ps-name" value="' + esc(ps.name || '') + '" placeholder="Jina la muamala">' +
      '<label style="font-size:0.85rem;font-weight:bold;">Bei:</label>' +
      '<input type="text" id="ps-amount" value="' + esc(ps.amount || '') + '" placeholder="Mf. 5000 TZS / mwezi">' +
      '<button class="btn-primary mt-1" onclick="appAdmin.savePaySettings()">💾 Hifadhi</button>';
  },
  savePaySettings() {
    DB.set('paysettings', {
      method: document.getElementById('ps-method').value.trim(),
      number: document.getElementById('ps-number').value.trim(),
      name: document.getElementById('ps-name').value.trim(),
      amount: document.getElementById('ps-amount').value.trim()
    });
    toast('Payment settings zimehifadhiwa! 💾', 'success');
  },

  renderAnnouncements() {
    const area = document.getElementById('admin-content-area');
    const anns = DB.get('announcements', []);
    area.innerHTML = '<h4 style="margin-bottom:10px;">📢 Announcements (' + anns.length + ')</h4>' +
      '<button class="btn-primary" style="margin-bottom:15px;" onclick="ui.showModal(\'announcement-modal\')">➕ Tangazo Jipya</button>' +
      (anns.length ? anns.map(a =>
        '<div style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:10px;">' +
        '<span style="flex:1;font-size:0.9rem;">📢 ' + esc(a.text) + '</span>' +
        '<button class="btn-outline" style="padding:4px 10px;font-size:0.75rem;color:var(--danger);" onclick="appAdmin.deleteAnnouncement(\'' + a.id + '\')">🗑️</button></div>').join('')
        : '<p style="color:var(--text-muted);">Hakuna matangazo.</p>');
  },
  postAnnouncement() {
    const text = document.getElementById('announcement-text').value.trim();
    if (!text) return toast('Andika tangazo kwanza!', 'error');
    const anns = DB.get('announcements', []);
    anns.unshift({ id: uid(), text, time: Date.now() });
    DB.set('announcements', anns);
    document.getElementById('announcement-text').value = '';
    ui.hideModal('announcement-modal');
    loadAnnouncements();
    appAdmin.renderAnnouncements();
    toast('Tangazo limetumwa! 📢', 'success');
  },
  deleteAnnouncement(id) {
    DB.set('announcements', DB.get('announcements', []).filter(a => a.id !== id));
    loadAnnouncements();
    appAdmin.renderAnnouncements();
  },

  renderReports() {
    const area = document.getElementById('admin-content-area');
    const reps = DB.get('reports', []);
    area.innerHTML = '<h4 style="margin-bottom:10px;color:var(--danger);">🐞 Bug/Post Reports (' + reps.length + ')</h4>' + (reps.length ? reps.map(r => {
      const u = getUser(r.userId);
      return '<div style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px;">' +
        '<strong>' + esc(u ? u.username : 'Unknown') + '</strong> <small style="color:var(--text-muted);">' + timeAgo(r.time) + '</small>' +
        (r.resolved ? ' <span class="post-status" style="background:#d4edda;color:#155724;">✅ Resolved</span>' : ' <span class="post-status">⏳ Pending</span>') +
        '<p style="margin:6px 0;font-size:0.9rem;">' + esc(r.text) + '</p>' +
        (!r.resolved ? '<button class="btn-outline" style="padding:5px 12px;font-size:0.8rem;border-color:var(--success);color:var(--success);" onclick="appAdmin.resolveReport(\'' + r.id + '\')">✅ Mark Resolved</button> ' : '') +
        '<button class="btn-outline" style="padding:5px 12px;font-size:0.8rem;color:var(--danger);" onclick="appAdmin.deleteReport(\'' + r.id + '\')">🗑️</button>' +
        '</div>';
    }).join('') : '<p style="color:var(--text-muted);">Hakuna ripoti. Shukrani! 🎉</p>');
  },
  resolveReport(id) {
    const reps = DB.get('reports', []);
    const r = reps.find(x => x.id === id);
    if (r) { r.resolved = true; DB.set('reports', reps); }
    appAdmin.renderReports();
  },
  deleteReport(id) {
    DB.set('reports', DB.get('reports', []).filter(r => r.id !== id));
    appAdmin.renderReports();
  },

  renderAppeals() {
    const area = document.getElementById('admin-content-area');
    const apps = DB.get('appeals', []);
    area.innerHTML = '<h4 style="margin-bottom:10px;color:var(--primary);">⚖️ Block Appeals (' + apps.length + ')</h4>' + (apps.length ? apps.map(a => {
      const u = getUser(a.userId);
      return '<div style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px;">' +
        '<strong>' + esc(u ? u.username : 'Unknown') + '</strong> <small style="color:var(--text-muted);">' + timeAgo(a.time) + '</small>' +
        (a.resolved ? ' <span class="post-status" style="background:#d4edda;color:#155724;">✅ Done</span>' : ' <span class="post-status">⏳ Pending</span>') +
        '<p style="margin:6px 0;font-size:0.9rem;">' + esc(a.text) + '</p>' +
        (!a.resolved ? '<button class="btn-outline" style="padding:5px 12px;font-size:0.8rem;border-color:var(--success);color:var(--success);" onclick="appAdmin.approveAppeal(\'' + a.id + '\')">🔓 Fungua User</button> ' : '') +
        '<button class="btn-outline" style="padding:5px 12px;font-size:0.8rem;color:var(--danger);" onclick="appAdmin.deleteAppeal(\'' + a.id + '\')">🗑️</button>' +
        '</div>';
    }).join('') : '<p style="color:var(--text-muted);">Hakuna maombi ya kufunguliwa.</p>');
  },
  approveAppeal(id) {
    const apps = DB.get('appeals', []);
    const a = apps.find(x => x.id === id);
    if (a) {
      a.resolved = true; DB.set('appeals', apps);
      const u = getUser(a.userId);
      if (u) { u.blocked = false; updateUser(u); }
      toast('User amefunguliwa! 🔓', 'success');
    }
    appAdmin.renderAppeals();
  },
  deleteAppeal(id) {
    DB.set('appeals', DB.get('appeals', []).filter(a => a.id !== id));
    appAdmin.renderAppeals();
  }
};
window.appAdmin = appAdmin;

// ---------------- App Entry ----------------
function enterApp() {
  currentUser = getUser(DB.get('session', null));
  window.currentUser = currentUser;
  if (!currentUser) return;
  // Supabase sync: role/premium/verified come from the database (DB wins over localStorage)
  if (window.SupabaseSync) {
    SupabaseSync.pullUser(currentUser).then(synced => {
      if (synced) {
        currentUser = synced;
        window.currentUser = synced;
        updateProfileUI();
        renderFeed(currentFeedFilter);
        loadAnnouncements();
      }
    }).catch(() => {});
  }
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('main-screen').classList.add('active');
  updateProfileUI();
  loadAnnouncements();
  updateChatBadge();
  router.navigate('home');
  // deep link from chat: index.html?user=<id>
  const params = new URLSearchParams(location.search);
  const uParam = params.get('user');
  if (uParam && getUser(uParam)) {
    viewingUserId = uParam; window.viewingUserId = uParam;
    renderOtherProfile();
    router.navigate('other-profile');
  }
}

// comment input: Enter key sends
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'comment-input') appFeatures.addComment();
});

// ---------------- Init ----------------
(function init() {
  seed();
  applyLang(DB.get('lang', 'sw'));
  if (DB.get('theme', 'light') === 'dark' || localStorage.getItem('st_theme') === 'dark')
    document.body.classList.add('dark');
  const sessionId = DB.get('session', null);
  if (sessionId && getUser(sessionId)) {
    // user already logged in
    document.addEventListener('DOMContentLoaded', enterApp);
    if (document.readyState !== 'loading') enterApp();
  }
})();