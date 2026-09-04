// db.js — клиентская часть для работы с сервером

const API_URL = window.location.origin + '/api';

const DB = {
  // === НОВОСТИ ===
  async getNews() {
    try {
      const res = await fetch(`${API_URL}/news`);
      return await res.json();
    } catch (e) { return []; }
  },
  
  async addNews(title, text) {
    try {
      await fetch(`${API_URL}/news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, text })
      });
    } catch (e) { console.error(e); }
  },
  
  async deleteNews(id) {
    try {
      await fetch(`${API_URL}/news/${id}`, { method: 'DELETE' });
    } catch (e) { console.error(e); }
  },

  // === МОДЫ ===
  async getMods() {
    try {
      const res = await fetch(`${API_URL}/mods`);
      return await res.json();
    } catch (e) { return []; }
  },
  
  async addMod(name, why) {
    try {
      await fetch(`${API_URL}/mods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, why })
      });
    } catch (e) { console.error(e); }
  },
  
  async deleteMod(id) {
    try {
      await fetch(`${API_URL}/mods/${id}`, { method: 'DELETE' });
    } catch (e) { console.error(e); }
  },

  // === АПЕЛЛЯЦИИ ===
  async getAppeals() {
    try {
      const res = await fetch(`${API_URL}/appeals`);
      return await res.json();
    } catch (e) { return []; }
  },
  
  async addAppeal(data) {
    try {
      await fetch(`${API_URL}/appeals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) { console.error(e); }
  },
  
  async setAppealStatus(id, status) {
    try {
      await fetch(`${API_URL}/appeals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    } catch (e) { console.error(e); }
  },

  // === ПОЛЬЗОВАТЕЛИ ===
  async getUsers() {
    try {
      const res = await fetch(`${API_URL}/users`);
      return await res.json();
    } catch (e) { return []; }
  },
  
  async toggleBan(username, banned) {
    try {
      await fetch(`${API_URL}/users/${username}/ban`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned })
      });
    } catch (e) { console.error(e); }
  }
};

// === АВТОРИЗАЦИЯ ===
const Auth = {
  getToken() {
    return localStorage.getItem('ra_token');
  },
  
  currentUser() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { username: payload.username, role: payload.role };
    } catch (e) { return null; }
  },
  
  async login(username, password) {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem('ra_token', data.token);
        return { ok: true, user: data.user };
      }
      return { ok: false, msg: data.msg };
    } catch (e) {
      return { ok: false, msg: 'Ошибка соединения с сервером' };
    }
  },
  
  async register(username, email, password, ign) {
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, ign })
      });
      return await res.json();
    } catch (e) {
      return { ok: false, msg: 'Ошибка соединения с сервером' };
    }
  },
  
  async verify(email, code) {
    try {
      const res = await fetch(`${API_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem('ra_token', data.token);
      }
      return data;
    } catch (e) {
      return { ok: false, msg: 'Ошибка соединения с сервером' };
    }
  },
  
  logout() {
    localStorage.removeItem('ra_token');
  }
};
