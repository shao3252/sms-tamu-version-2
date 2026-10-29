/* ============================================================
   Sms Tamu 💖 - premium.js  (VIP "Message Kuntu" System)
============================================================ */

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
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' hrs ago';
  return Math.floor(s / 86400) + ' days ago';
}

function toast(msg, type) {
  type = type || 'info';
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; }, 3000);
  setTimeout(() => t.remove(), 3500);
}

const ui = {
  showModal(id) { const m = document.getElementById(id); if (m) m.classList.add('active'); },
  hideModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('active'); }
};

const getUsers = () => DB.get('users', []);
const getUser = id => getUsers().find(u => u.id === id) || null;
const getVipPosts = () => DB.get('vipPosts', []);

const currentUser = (() => {
  const id = DB.get('session', null);
  return id ? getUser(id) : null;
})();

if (!currentUser) window.location.href = 'index.html';

const hasAccess = () => currentUser && (currentUser.premium || currentUser.admin);

// ---------------- Premium System ----------------
const premiumSystem = {
  init() {
    if (!currentUser) return;
    // admin sees the "Add VIP" button
    const adminBtn = document.getElementById('admin-create-vip-btn');
    if (adminBtn) adminBtn.style.display = currentUser.admin ? 'block' : 'none';

    if (hasAccess()) {
      document.getElementById('premium-feed-section').style.display = 'block';
      this.renderFeed();
    } else {
      document.getElementById('paywall-section').style.display = 'block';
      this.renderPaywall();
    }
  },

  renderPaywall() {
    const ps = DB.get('paysettings', {});
    const box = document.getElementById('payment-details-box');
    if (!box) return;
    box.innerHTML =
      '<p style="margin-bottom:8px;"><strong>💳 Njia:</strong> ' + esc(ps.method || 'M-Pesa / Tigo Pesa') + '</p>' +
      '<p style="margin-bottom:8px;"><strong>📱 Namba:</strong> <span style="color:var(--primary);font-weight:bold;">' + esc(ps.number || '2557xxxxxxxx') + '</span></p>' +
      '<p style="margin-bottom:8px;"><strong>👤 Jina:</strong> ' + esc(ps.name || 'SMS TAMU VIP') + '</p>' +
      '<p style="margin-bottom:0;"><strong>💰 Bei:</strong> <span style="color:#d4af37;font-weight:bold;">' + esc(ps.amount || '5000 TZS / mwezi') + '</span></p>';
  },

  submitPremium() {
    const name = document.getElementById('premium-trans-name').value.trim();
    if (!name) return toast('Andika jina la muamala kwanza!', 'error');
    const reqs = DB.get('premiumReq', []);
    // one active request at a time
    const existing = reqs.find(r => r.userId === currentUser.id && r.status === 'pending');
    if (existing) return toast('Ombi lako tayari lipo. Subiri Admin athibitishe. ⏳', 'error');
    reqs.unshift({ id: uid(), userId: currentUser.id, transName: name, time: Date.now(), status: 'pending' });
    DB.set('premiumReq', reqs);
    document.getElementById('premium-trans-name').value = '';
    document.getElementById('premium-form-area').style.display = 'none';
    const btn = document.getElementById('show-pay-form-btn');
    if (btn) btn.style.display = 'block';
    toast('Muamala wako umetumwa! Admin atakagua na kukufungulia Kuntu. 🌟', 'success');
  },

  renderFeed() {
    const cont = document.getElementById('premium-container');
    if (!cont) return;
    const posts = getVipPosts().slice().sort((a, b) => b.time - a.time);
    cont.innerHTML = posts.length ? posts.map(p => {
      const author = getUser(p.authorId) || { username: 'Admin' };
      const liked = currentUser && (p.likes || []).includes(currentUser.id);
      return '<div class="card" style="border:1px solid #d4af37;background:linear-gradient(to bottom right, var(--card-bg), rgba(212,175,55,0.06));">' +
        '<div class="post-header">' +
          '<img src="' + (author.pic || DEFAULT_AVATAR) + '" class="avatar" style="border-color:#d4af37;">' +
          '<div class="post-meta"><div class="post-author">' + esc(author.username) +
            ' <span style="color:#d4af37;">🌟</span></div>' +
          '<div class="post-time">' + timeAgo(p.time) + '</div></div>' +
        '</div>' +
        '<div class="post-text">' + esc(p.text) + '</div>' +
        '<div class="post-actions">' +
          '<button class="action-btn' + (liked ? ' active' : '') + '" onclick="premiumSystem.toggleLike(\'' + p.id + '\')">❤️ <span>' + (p.likes || []).length + '</span></button>' +
          '<button class="action-btn" onclick="premiumSystem.copyPost(\'' + p.id + '\')">📋 Nakili</button>' +
        '</div></div>';
    }).join('') : '<p style="text-align:center;color:var(--text-muted);padding:30px;">Meseji za Kuntu zijaongezeka hivi karibuni. Rudi baadaye! 🌟</p>';
  },

  toggleLike(id) {
    const posts = getVipPosts();
    const p = posts.find(x => x.id === id);
    if (!p) return;
    p.likes = p.likes || [];
    const i = p.likes.indexOf(currentUser.id);
    if (i > -1) p.likes.splice(i, 1); else p.likes.push(currentUser.id);
    DB.set('vipPosts', posts);
    this.renderFeed();
  },

  copyPost(id) {
    const p = getVipPosts().find(x => x.id === id);
    if (!p) return;
    const done = () => toast('Imenakiliwa! 📋', 'success');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(p.text).then(done).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = p.text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { toast('Imeshindikana', 'error'); }
        ta.remove();
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = p.text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Imeshindikana', 'error'); }
      ta.remove();
    }
  },

  createVipPost() {
    if (!currentUser.admin) return toast('Ni Admin tu anayeweza kuandika Kuntu. 👑', 'error');
    const text = document.getElementById('vip-post-text').value.trim();
    if (!text) return toast('Andika meseji kwanza!', 'error');
    const posts = getVipPosts();
    posts.unshift({ id: uid(), text, authorId: currentUser.id, time: Date.now(), likes: [] });
    DB.set('vipPosts', posts);
    document.getElementById('vip-post-text').value = '';
    ui.hideModal('vip-create-modal');
    toast('Message Kuntu imetumwa kwa wanachama! 🌟', 'success');
    if (hasAccess()) this.renderFeed();
  }
};
window.premiumSystem = premiumSystem;
window.ui = ui;

// ---------------- Init ----------------
(function init() {
  if (localStorage.getItem('st_theme') === 'dark')
    document.body.classList.add('dark');
  if (currentUser) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => premiumSystem.init());
    else premiumSystem.init();
  }
})();