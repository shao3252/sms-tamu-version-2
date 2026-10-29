/* ============================================================
   Sms Tamu 💖 - chat.js  (Global Group Chat)
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

function fmtTime(ts) {
  const d = new Date(ts);
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

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

const ui = {
  showModal(id) { const m = document.getElementById(id); if (m) m.classList.add('active'); },
  hideModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('active'); }
};

// ---------------- Data Access ----------------
const getUsers = () => DB.get('users', []);
const getUser = id => getUsers().find(u => u.id === id) || null;
const getChat = () => DB.get('chat', { groupName: '🌍 Global Group', groupPic: '', locked: false, admins: [], messages: [] });
const saveChat = c => DB.set('chat', c);

const currentUser = (() => {
  const id = DB.get('session', null);
  return id ? getUser(id) : null;
})();

if (!currentUser) {
  // must be logged in
  window.location.href = 'index.html';
}

const isAdmin = () => {
  const chat = getChat();
  return currentUser && (currentUser.admin || (chat.admins || []).includes(currentUser.id));
};

let replyTarget = null;   // message being replied to
let optionMsgId = null;   // message opened in options modal

// ---------------- Chat System ----------------
const chatSystem = {
  init() {
    if (!currentUser) return;
    // mark as read (clears the badge on home page)
    DB.set('lastseen_' + currentUser.id, Date.now());
    this.renderHeader();
    this.renderMessages();
    const settingsBtn = document.getElementById('group-settings-btn');
    if (settingsBtn) settingsBtn.style.display = isAdmin() ? 'block' : 'none';
    const input = document.getElementById('chat-msg-input');
    if (input) input.addEventListener('keydown', e => {
      if (e.key === 'Enter') chatSystem.sendGlobalMessage();
    });
  },

  renderHeader() {
    const chat = getChat();
    const title = document.getElementById('group-title');
    if (title) title.textContent = chat.groupName || '🌍 Global Group';
    const pic = document.getElementById('group-pic');
    if (pic) pic.src = chat.groupPic || pic.src;
    const status = document.getElementById('group-status');
    if (status) {
      const online = getUsers().filter(u => !u.blocked).length;
      status.textContent = chat.locked ? '🔒 Group imefungwa (Admins pekee)' : online + ' wako karibu • Tupo Online';
      status.style.color = chat.locked ? 'var(--danger)' : 'var(--success)';
    }
    const lockBtn = document.getElementById('toggle-lock-btn');
    if (lockBtn) lockBtn.textContent = chat.locked ? '🔓 Fungua Group (Unlock)' : '🔒 Funga Group (Lock)';
  },

  renderMessages() {
    const chat = getChat();
    const box = document.getElementById('global-chat-box');
    if (!box) return;

    const blockedByMe = currentUser.blockedUsers || [];
    const msgs = chat.messages.filter(m => !blockedByMe.includes(m.userId));

    box.innerHTML = msgs.length ? msgs.map(m => {
      const mine = m.userId === currentUser.id;
      const replyBlock = m.replyTo
        ? '<div class="reply-block"><strong>' + esc(m.replyTo.name) + ':</strong> ' + esc(m.replyTo.text) + '</div>'
        : '';
      const pinIcon = m.pinned ? '📌 ' : '';
      return '<div style="display:flex;flex-direction:column;' + (mine ? 'align-items:flex-end;' : 'align-items:flex-start;') + 'margin-bottom:12px;">' +
        (!mine ? '<small style="color:var(--text-muted);font-size:0.75rem;margin-bottom:2px;margin-left:8px;cursor:pointer;" ' +
          'onclick="window.location.href=\'index.html?user=' + m.userId + '\'">' + pinIcon + esc(m.name) + '</small>' : (pinIcon ? '<small style="color:var(--text-muted);font-size:0.75rem;margin-bottom:2px;margin-right:8px;">📌</small>' : '')) +
        '<div class="msg-bubble ' + (mine ? 'msg-mine' : 'msg-others') + '" onclick="chatSystem.openOptions(\'' + m.id + '\')">' +
          replyBlock + esc(m.text) +
          '<span class="chat-time">' + fmtTime(m.time) + '</span>' +
        '</div></div>';
    }).join('') : '<p style="text-align:center;color:var(--text-muted);padding:40px 20px;">Hakuna ujumbe bado. Anzisha mazungumzo! 💬<br><small>Tap ujumbe kwa options.</small></p>';

    // pinned bar
    const pinnedCount = chat.messages.filter(m => m.pinned).length;
    const bar = document.getElementById('pinned-bar');
    if (bar) bar.style.display = pinnedCount > 0 ? 'block' : 'none';
    const pc = document.getElementById('pin-count');
    if (pc) pc.textContent = pinnedCount;

    box.scrollTop = box.scrollHeight;
  },

  sendGlobalMessage() {
    const input = document.getElementById('chat-msg-input');
    const text = input.value.trim();
    if (!text) return;
    const chat = getChat();
    if (currentUser.blocked) return toast('Akaunti yako imefungwa. Huwezi kutuma ujumbe. ⚠️', 'error');
    if (chat.locked && !isAdmin()) return toast('Group imefungwa na Admin. Wanachama wa kawaida hawawezi kutuma sasa. 🔒', 'error');

    chat.messages.push({
      id: uid(),
      userId: currentUser.id,
      name: currentUser.username,
      pic: currentUser.pic || '',
      text,
      time: Date.now(),
      pinned: false,
      replyTo: replyTarget ? { name: replyTarget.name, text: replyTarget.text.slice(0, 80) } : null
    });
    saveChat(chat);
    input.value = '';
    this.cancelReply();
    this.renderMessages();
  },

  // ---- Reply ----
  actionReply() {
    const chat = getChat();
    const m = chat.messages.find(x => x.id === optionMsgId);
    if (!m) return;
    replyTarget = m;
    const preview = document.getElementById('reply-preview');
    if (preview) preview.style.display = 'block';
    const rn = document.getElementById('reply-name');
    if (rn) rn.textContent = '↩️ ' + m.name;
    const rt = document.getElementById('reply-text');
    if (rt) rt.textContent = m.text;
    ui.hideModal('msg-options-modal');
    const inp = document.getElementById('chat-msg-input');
    if (inp) inp.focus();
  },
  cancelReply() {
    replyTarget = null;
    const preview = document.getElementById('reply-preview');
    if (preview) preview.style.display = 'none';
  },

  // ---- Options modal ----
  openOptions(msgId) {
    const chat = getChat();
    const m = chat.messages.find(x => x.id === msgId);
    if (!m) return;
    optionMsgId = msgId;
    const mine = m.userId === currentUser.id;
    const admin = isAdmin();
    const show = (id, cond) => { const el = document.getElementById(id); if (el) el.style.display = cond ? 'block' : 'none'; };

    show('opt-profile', !mine);
    show('opt-pin', admin);
    show('opt-admin-make', admin && !mine && !(chat.admins || []).includes(m.userId) && !getUser(m.userId)?.admin);
    show('opt-admin-remove', admin && !mine && ((chat.admins || []).includes(m.userId) || (getUser(m.userId) || {}).admin));
    show('opt-block', !mine);
    show('opt-delete', mine || admin);

    const pinBtn = document.getElementById('opt-pin');
    if (pinBtn && admin) pinBtn.textContent = m.pinned ? '📌 Unpin Message' : '📌 Pin Message';

    ui.showModal('msg-options-modal');
  },

  actionCopy() {
    const chat = getChat();
    const m = chat.messages.find(x => x.id === optionMsgId);
    if (!m) return;
    const done = () => toast('Imenakiliwa! 📋', 'success');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(m.text).then(done).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = m.text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { toast('Imeshindikana', 'error'); }
        ta.remove();
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = m.text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Imeshindikana', 'error'); }
      ta.remove();
    }
    ui.hideModal('msg-options-modal');
  },

  actionViewProfile() {
    const chat = getChat();
    const m = chat.messages.find(x => x.id === optionMsgId);
    if (m) window.location.href = 'index.html?user=' + m.userId;
  },

  actionPin() {
    const chat = getChat();
    const m = chat.messages.find(x => x.id === optionMsgId);
    if (!m) return;
    m.pinned = !m.pinned;
    saveChat(chat);
    ui.hideModal('msg-options-modal');
    this.renderMessages();
    toast(m.pinned ? 'Ujumbe umepinned! 📌' : 'Pin imeondolewa.', 'success');
  },

  actionMakeAdmin() {
    const chat = getChat();
    const m = chat.messages.find(x => x.id === optionMsgId);
    if (!m) return;
    chat.admins = chat.admins || [];
    if (!chat.admins.includes(m.userId)) chat.admins.push(m.userId);
    saveChat(chat);
    ui.hideModal('msg-options-modal');
    toast(esc(m.name) + ' sasa ni Admin wa Group! 👑', 'success');
  },

  actionRemoveAdmin() {
    const chat = getChat();
    const m = chat.messages.find(x => x.id === optionMsgId);
    if (!m) return;
    chat.admins = (chat.admins || []).filter(id => id !== m.userId);
    const u = getUser(m.userId);
    if (u && u.admin && !currentUser.admin) { toast('Hawezi kuondolewa (ni Admin wa app).', 'error'); return; }
    saveChat(chat);
    ui.hideModal('msg-options-modal');
    toast(esc(m.name) + ' ameondolewa kwenye u-admin. ⬇️', 'success');
  },

  actionBlockUser() {
    const chat = getChat();
    const m = chat.messages.find(x => x.id === optionMsgId);
    if (!m) return;
    if (!confirm('Block ' + m.name + '? Hutaona ujumbe zake tena na wala posts zake.')) return;
    const me = Object.assign({}, currentUser);
    me.blockedUsers = me.blockedUsers || [];
    if (!me.blockedUsers.includes(m.userId)) me.blockedUsers.push(m.userId);
    const users = getUsers();
    const i = users.findIndex(u => u.id === me.id);
    if (i > -1) { users[i] = me; DB.set('users', users); }
    ui.hideModal('msg-options-modal');
    this.renderMessages();
    toast(esc(m.name) + ' ameblockiwa. 🚫', 'success');
  },

  actionDelete() {
    const chat = getChat();
    const m = chat.messages.find(x => x.id === optionMsgId);
    if (!m) return;
    if (!confirm('Futa ujumbe huu?')) return;
    saveChat({ ...chat, messages: chat.messages.filter(x => x.id !== optionMsgId) });
    ui.hideModal('msg-options-modal');
    this.renderMessages();
    toast('Ujumbe umefutwa. 🗑️', 'success');
  },

  // ---- Pinned ----
  showAllPinned() {
    const chat = getChat();
    const pinned = chat.messages.filter(m => m.pinned);
    const cont = document.getElementById('pinned-list-container');
    if (!cont) return;
    cont.innerHTML = pinned.length ? pinned.map(m =>
      '<div style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px;">' +
      '<strong style="color:var(--primary);font-size:0.85rem;">' + esc(m.name) + '</strong> ' +
      '<small style="color:var(--text-muted);">' + fmtTime(m.time) + '</small>' +
      '<div style="margin-top:4px;font-size:0.9rem;">' + esc(m.text) + '</div></div>').join('')
      : '<p style="text-align:center;color:var(--text-muted);">Hakuna ujumbe ulio pinned.</p>';
    ui.showModal('pinned-modal');
  },

  // ---- Group settings (admins) ----
  uploadGroupImage(e) {
    if (!isAdmin()) return toast('Ni Admins tu wanaweza kubadilisha picha. ⚙️', 'error');
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => {
      const chat = getChat();
      chat.groupPic = ev.target.result;
      saveChat(chat);
      document.getElementById('group-pic').src = ev.target.result;
      toast('Picha ya group imebadilishwa! 📷', 'success');
    };
    r.readAsDataURL(file);
    e.target.value = '';
  },

  editGroupName() {
    if (!isAdmin()) return toast('Ni Admins tu. ⚙️', 'error');
    const chat = getChat();
    const name = prompt('Jina jipya la Group:', chat.groupName || '🌍 Global Group');
    if (!name || !name.trim()) return;
    chat.groupName = name.trim();
    saveChat(chat);
    document.getElementById('group-title').textContent = chat.groupName;
    ui.hideModal('group-settings-modal');
    toast('Jina la group limebadilishwa! ✏️', 'success');
  },

  toggleGroupLock() {
    if (!isAdmin()) return toast('Ni Admins tu. ⚙️', 'error');
    const chat = getChat();
    chat.locked = !chat.locked;
    saveChat(chat);
    ui.hideModal('group-settings-modal');
    this.renderHeader();
    toast(chat.locked ? 'Group imefungwa. Wanachama hawawezi kutuma. 🔒' : 'Group imefunguliwa! 🔓', chat.locked ? 'error' : 'success');
  }
};
window.chatSystem = chatSystem;
window.ui = ui;

// ---------------- Init ----------------
(function init() {
  if (localStorage.getItem('st_theme') === 'dark')
    document.body.classList.add('dark');
  if (currentUser) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => chatSystem.init());
    else chatSystem.init();
  }
})();