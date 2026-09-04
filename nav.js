const SHOP_URL = 'https://reallyanarchy.easydonate.ru/';

function renderNav(activePage) {
  const user = Auth.currentUser();

  const linksLeft = [
    ['index.html','Новости'],
    ['rules.html','Правила'],
    ['mods.html','Моды'],
    ['appeal.html','Апелляция'],
    [SHOP_URL,'Магазин', true], // true = внешняя ссылка
  ];

  const linksHtml = linksLeft.map(([href,label,external]) =>
    external
      ? `<a href="${href}" target="_blank" rel="noopener">${label}</a>`
      : `<a href="${href}"${activePage===href?' class="active"':''}>${label}</a>`
  ).join('');

  let rightHtml;
  if (user) {
    rightHtml = `
      <span class="dim" style="font-size:13px;">${escapeHtml(user.username)}${user.role==='admin' ? ' <span class="badge admin">admin</span>' : ''}</span>
      ${user.role==='admin' ? '<a href="admin.html" class="btn small">Админ-панель</a>' : ''}
      <button class="btn small" id="logoutBtn">Выйти</button>
    `;
  } else {
    rightHtml = `<a href="auth.html" class="btn small primary">Войти / Регистрация</a>`;
  }

  document.getElementById('nav-root').innerHTML = `
    <header class="site">
      <div class="wrap nav-row">
        <a href="index.html" class="brand"><span class="dot"></span>REALLY<span class="tag">ANARCHY</span></a>
        <nav class="links">${linksHtml}</nav>
        <div class="nav-right">${rightHtml}</div>
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
