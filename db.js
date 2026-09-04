/* =========================================================
   REALLYANARCHY — data layer
   Everything lives in this browser's localStorage. There is no
   server, so accounts/news/appeals are NOT shared between visitors —
   see README.md "Важное ограничение" for what this means and how
   to upgrade to a real shared backend later.
   ========================================================= */

const DB_KEY = 'ra_db_v1';
const SESSION_KEY = 'ra_session_v1';

// change this before you make the site public
const DEFAULT_ADMIN = { username: 'tufhj', password: 'changeme123', role: 'admin', banned: false, ign: 'tufhj' };

const DB = {
  _read(){
    const raw = localStorage.getItem(DB_KEY);
    if(!raw) return DB._seed();
    try{ return JSON.parse(raw); } catch(e){ return DB._seed(); }
  },
  _write(data){ localStorage.setItem(DB_KEY, JSON.stringify(data)); },

  _seed(){
    const data = {
      users: [ { ...DEFAULT_ADMIN } ],
      news: [
        { id: cryptoId(), title: 'Запуск REALLYANARCHY', date: todayStr(), text: 'Сервер открыт. Анархия, минимум правил, максимум последствий. Правила проекта — на странице «Правила». Успевай застолбить точку, пока карта чистая.', _ts: Date.now() - 1000 },
        { id: cryptoId(), title: 'Обновление списка запрещённых модификаций', date: todayStr(), text: 'Античит подтягивает новые сигнатуры x-ray и killaura клиентов. Актуальный список смотри на странице «Моды».', _ts: Date.now() }
      ],
      appeals: [],
      mods: [
        { id: cryptoId(), name: 'X-Ray клиенты / текстур-паки', why: 'Подсветка руды сквозь блоки — бан без предупреждения.' },
        { id: cryptoId(), name: 'Killaura / Reach / AutoClicker с читом', why: 'Любой combat-чит, дающий преимущество в PvP.' },
        { id: cryptoId(), name: 'Freecam, ESP, Fullbright с обходом читкика', why: 'Разведка через блоки, недоступная на ванильном клиенте.' },
        { id: cryptoId(), name: 'Скрипты авто-фарма / макросы 24/7', why: 'Автоматизация игры без присутствия игрока.' }
      ]
    };
    DB._write(data);
    return data;
  },

  reset(){ localStorage.removeItem(DB_KEY); return DB._read(); },

  getUsers(){ return DB._read().users; },
  saveUsers(users){ const d = DB._read(); d.users = users; DB._write(d); },

  getNews(){ return DB._read().news.sort((a,b)=> b._ts - a._ts || 0); },
  addNews(title, text){
    const d = DB._read();
    d.news.unshift({ id: cryptoId(), title, text, date: todayStr(), _ts: Date.now() });
    DB._write(d);
  },
  deleteNews(id){ const d = DB._read(); d.news = d.news.filter(n=>n.id!==id); DB._write(d); },

  getAppeals(){ return DB._read().appeals.slice().reverse(); },
  addAppeal(a){
    const d = DB._read();
    d.appeals.push({ id: cryptoId(), status:'pending', date: todayStr(), ...a });
    DB._write(d);
  },
  setAppealStatus(id, status){
    const d = DB._read();
    const a = d.appeals.find(x=>x.id===id);
    if(a) a.status = status;
    DB._write(d);
  },

  getMods(){ return DB._read().mods; },
  addMod(name, why){ const d = DB._read(); d.mods.unshift({ id: cryptoId(), name, why }); DB._write(d); },
  deleteMod(id){ const d = DB._read(); d.mods = d.mods.filter(m=>m.id!==id); DB._write(d); }
};

function cryptoId(){ return Math.random().toString(36).slice(2,10) + Date.now().toString(36); }
function todayStr(){ return new Date().toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' }); }

const Auth = {
  currentUser(){
    const name = sessionStorage.getItem(SESSION_KEY);
    if(!name) return null;
    return DB.getUsers().find(u=>u.username===name) || null;
  },
  login(username, password){
    const user = DB.getUsers().find(u=>u.username.toLowerCase()===username.toLowerCase());
    if(!user || user.password !== password) return { ok:false, msg:'Неверный ник или пароль.' };
    if(user.banned) return { ok:false, msg:'Этот аккаунт заблокирован на сайте.' };
    sessionStorage.setItem(SESSION_KEY, user.username);
    return { ok:true, user };
  },
  register(username, password, ign){
    username = username.trim();
    if(username.length < 3) return { ok:false, msg:'Ник должен быть не короче 3 символов.' };
    if(password.length < 4) return { ok:false, msg:'Пароль должен быть не короче 4 символов.' };
    const users = DB.getUsers();
    if(users.some(u=>u.username.toLowerCase()===username.toLowerCase())) return { ok:false, msg:'Такой ник уже зарегистрирован.' };
    users.push({ username, password, role:'user', banned:false, ign: ign || username });
    DB.saveUsers(users);
    sessionStorage.setItem(SESSION_KEY, username);
    return { ok:true };
  },
  logout(){ sessionStorage.removeItem(SESSION_KEY); }
};
