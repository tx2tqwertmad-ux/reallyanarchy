const SHOP_URL = 'https://reallyanarchy.easydonate.ru/';

function renderNav(activePage) {
  const user = Auth.currentUser();

  const linksLeft = [
    ['index.html','Новости'],
    ['rules.html','Правила'],
    ['mods.html','Моды'],
    ['appeal.html','Апелляция'],
    ['forum.html','Форум'],
    [SHOP_URL,'Магазин', true],
  ];

  const linksHtml = linksLeft.map(([href,label,external]) =>
    external
      ? `<a href="${href}" target="_blank" rel="noopener">${label}</a>`
      : `<a href="${href}"${activePage===href?' class="active"':''}>${label}</a>`
  ).join('');

  let rightHtml;
  if (user) {
    let avatarHtml = '';
    try {
      const raw = localStorage.getItem('ra_profile_data');
      if (raw) {
        const all = JSON.parse(raw);
        if (all[user.username] && all[user.username].avatar) {
          avatarHtml = `<img src="${all[user.username].avatar}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid var(--lime);">`;
        }
      }
    } catch(e) {}
    if (!avatarHtml) {
      avatarHtml = `<div style="width:32px;height:32px;border-radius:50%;background:var(--lime);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:14px;color:#141400;font-weight:700;">${user.username.charAt(0).toUpperCase()}</div>`;
    }

    rightHtml = `
      <div class="user-menu" style="display:flex;align-items:center;gap:12px;position:relative;">
        <!-- КОЛОКОЛЬЧИК -->
        <button class="notif-btn" id="notifBtn" style="background:none;border:none;cursor:pointer;padding:4px;position:relative;">
          <img src="bell_32x32.png" alt="Уведомления" style="width:28px;height:28px;filter:brightness(0.7);transition:filter 0.2s;">
          <span id="notifBadge" style="position:absolute;top:-2px;right:-4px;background:var(--red);color:#fff;font-size:10px;border-radius:50%;width:18px;height:18px;display:none;align-items:center;justify-content:center;font-weight:700;">0</span>
        </button>

        <!-- КОНВЕРТ -->
        <button class="msg-btn" id="msgBtn" style="background:none;border:none;cursor:pointer;padding:4px;">
          <img src="envelope_32x32.png" alt="Сообщения" style="width:28px;height:28px;filter:brightness(0.7);transition:filter 0.2s;">
        </button>

        <!-- АВАТАР + НИК -->
        <div class="user-dropdown-trigger" style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 8px;border-radius:var(--radius);transition:background 0.2s;" id="userDropdownTrigger">
          ${avatarHtml}
          <span style="color:var(--text);font-size:13px;font-weight:600;">${escapeHtml(user.username)}</span>
          <span style="color:var(--text-dim);font-size:10px;">▼</span>
        </div>

        <!-- ВЫПАДАЮЩЕЕ МЕНЮ -->
        <div class="user-dropdown" id="userDropdown" style="display:none;position:absolute;top:100%;right:0;margin-top:8px;background:var(--bg-panel);border:1px solid var(--border);border-radius:var(--radius);min-width:220px;padding:8px 0;z-index:100;box-shadow:0 8px 32px rgba(0,0,0,0.6);">
          <a href="profile.html" style="display:flex;align-items:center;gap:10px;padding:10px 16px;color:var(--text);text-decoration:none;transition:background 0.15s;">
            <span>👤</span> Мой профиль
          </a>
          <a href="settings.html" style="display:flex;align-items:center;gap:10px;padding:10px 16px;color:var(--text);text-decoration:none;transition:background 0.15s;">
            <span>⚙️</span> Настройки
          </a>
          <a href="privacy.html" style="display:flex;align-items:center;gap:10px;padding:10px 16px;color:var(--text);text-decoration:none;transition:background 0.15s;">
            <span>🔐</span> Конфиденциальность
          </a>
          ${user.role === 'admin' ? `<a href="admin.html" style="display:flex;align-items:center;gap:10px;padding:10px 16px;color:var(--lime);text-decoration:none;transition:background 0.15s;">
            <span>🛠️</span> Админ-панель
          </a>` : ''}
          <div style="border-top:1px solid var(--border-lo);margin:4px 0;"></div>
          <button id="logoutBtn" style="display:flex;align-items:center;gap:10px;padding:10px 16px;color:var(--danger);background:none;border:none;width:100%;text-align:left;cursor:pointer;font-family:var(--font-body);font-size:13px;transition:background 0.15s;">
            <span>🚪</span> Выйти
          </button>
        </div>
      </div>

      <!-- ОПОВЕЩЕНИЯ -->
      <div class="notif-dropdown" id="notifDropdown" style="display:none;position:absolute;top:100%;right:0;margin-top:8px;background:var(--bg-panel);border:1px solid var(--border);border-radius:var(--radius);min-width:280px;max-width:320px;padding:12px 16px;z-index:100;box-shadow:0 8px 32px rgba(0,0,0,0.6);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span style="font-weight:700;color:var(--text);font-size:14px;">Уведомления</span>
          <span style="color:var(--text-dim);font-size:11px;cursor:pointer;" id="markAllRead">Отметить все</span>
        </div>
        <div id="notifList" style="max-height:300px;overflow-y:auto;">
          <div style="color:var(--text-dim);font-size:13px;text-align:center;padding:16px 0;">Нет новых уведомлений</div>
        </div>
        <div style="border-top:1px solid var(--border-lo);margin-top:10px;padding-top:10px;">
          <a href="#" style="color:var(--text-dim);font-size:12px;text-decoration:none;">Показать все</a>
        </div>
      </div>
    `;
  } else {
    rightHtml = `<a href="auth.html" class="btn small primary">Войти / Регистрация</a>`;
  }

  document.getElementById('nav-root').innerHTML = `
    <header class="site">
      <div class="wrap nav-row">
        <a href="index.html" class="brand"><span class="dot"></span>REALLY<span class="tag">ANARCHY</span></a>
        <nav class="links">${linksHtml}</nav>
        <div class="nav-right" style="position:relative;">${rightHtml}</div>
      </div>
    </header>
  `;

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => { 
      Auth.logout(); 
      location.href = 'index.html'; 
    });
  }

  const trigger = document.getElementById('userDropdownTrigger');
  const dropdown = document.getElementById('userDropdown');
  if (trigger && dropdown) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
      const notifDrop = document.getElementById('notifDropdown');
      if (notifDrop) notifDrop.style.display = 'none';
    });
  }

  const notifBtn = document.getElementById('notifBtn');
  const notifDrop = document.getElementById('notifDropdown');
  if (notifBtn && notifDrop) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDrop.style.display = notifDrop.style.display === 'block' ? 'none' : 'block';
      if (dropdown) dropdown.style.display = 'none';
    });
  }

  document.addEventListener('click', () => {
    if (dropdown) dropdown.style.display = 'none';
    if (notifDrop) notifDrop.style.display = 'none';
  });

  const msgBtn = document.getElementById('msgBtn');
  if (msgBtn) {
    msgBtn.addEventListener('click', () => {
      alert('📩 Личные сообщения будут доступны в ближайшее время!');
    });
  }
}

function renderFooter() {
  document.getElementById('footer-root').innerHTML = `
    <footer class="site">
      <div class="wrap">
        <span>REALLYANARCHY — анархия без границ, но по правилам сайта.</span>
        <span>IP сервера уточняй в Discord/новостях проекта</span>
      </div>
    </footer>
  `;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

function requireLogin() {
  if (!Auth.currentUser()) { location.href = 'auth.html'; }
}

function requireAdmin() {
  const u = Auth.currentUser();
  if (!u || u.role !== 'admin') { location.href = 'index.html'; }
}
