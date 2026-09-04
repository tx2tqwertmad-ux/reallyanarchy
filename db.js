const API_URL = window.location.origin + '/api';

const DB = {
  // === НОВОСТИ ===
  async getNews() {
    try {
      const res = await fetch(`${API_URL}/news`);
      if (!res.ok) throw new Error('Ошибка загрузки новостей');
      return await res.json();
    } catch (e) {
      console.error('getNews error:', e);
      return [];
    }
  },
  
  async addNews(title, text) {
    try {
      const res = await fetch(`${API_URL}/news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, text })
      });
      if (!res.ok) throw new Error('Ошибка добавления новости');
      return await res.json();
    } catch (e) {
      console.error('addNews error:', e);
      return { ok: false };
    }
  },
  
  async deleteNews(id) {
    try {
      const res = await fetch(`${API_URL}/news/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ошибка удаления новости');
      return await res.json();
    } catch (e) {
      console.error('deleteNews error:', e);
      return { ok: false };
    }
  },

  // === МОДЫ ===
  async getMods() {
    try {
      const res = await fetch(`${API_URL}/mods`);
      if (!res.ok) throw new Error('Ошибка загрузки модов');
      return await res.json();
    } catch (e) {
      console.error('getMods error:', e);
      return [];
    }
  },
  
  async addMod(name, why) {
    try {
      const res = await fetch(`${API_URL}/mods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, why })
      });
      if (!res.ok) throw new Error('Ошибка добавления мода');
      return await res.json();
    } catch (e) {
      console.error('addMod error:', e);
      return { ok: false };
    }
  },
  
  async deleteMod(id) {
    try {
      const res = await fetch(`${API_URL}/mods/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ошибка удаления мода');
      return await res.json();
    } catch (e) {
      console.error('deleteMod error:', e);
      return { ok: false };
    }
  },

  // === АПЕЛЛЯЦИИ ===
  async getAppeals() {
    try {
      const res = await fetch(`${API_URL}/appeals`);
      if (!res.ok) throw new Error('Ошибка загрузки апелляций');
      return await res.json();
    } catch (e) {
      console.error('getAppeals error:', e);
      return [];
    }
  },
  
  async addAppeal(data) {
    try {
      const res = await fetch(`${API_URL}/appeals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Ошибка отправки апелляции');
      return await res.json();
    } catch (e) {
      console.error('addAppeal error:', e);
      return { ok: false };
    }
  },
  
  async setAppealStatus(id, status) {
    try {
      const res = await fetch(`${API_URL}/appeals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Ошибка изменения статуса');
      return await res.json();
    } catch (e) {
      console.error('setAppealStatus error:', e);
      return { ok: false };
    }
  },

  // === ПОЛЬЗОВАТЕЛИ ===
  async getUsers() {
    try {
      const res = await fetch(`${API_URL}/users`);
      if (!res.ok) throw new Error('Ошибка загрузки пользователей');
      return await res.json();
    } catch (e) {
      console.error('getUsers error:', e);
      return [];
    }
  },
  
  async toggleBan(username, banned) {
    try {
      const res = await fetch(`${API_URL}/users/${username}/ban`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned })
      });
      if (!res.ok) throw new Error('Ошибка бана пользователя');
      return await res.json();
    } catch (e) {
      console.error('toggleBan error:', e);
      return { ok: false };
    }
  }
};

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
      console.error('login error:', e);
      return { ok: false, msg: 'Ошибка соединения с сервером' };
    }
  },
  
  async register(username, password, ign) {
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, ign })
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem('ra_token', data.token);
        return { ok: true, user: data.user };
      }
      return { ok: false, msg: data.msg };
    } catch (e) {
      console.error('register error:', e);
      return { ok: false, msg: 'Ошибка соединения с сервером' };
    }
  },
  
  logout() {
    localStorage.removeItem('ra_token');
  }
};
