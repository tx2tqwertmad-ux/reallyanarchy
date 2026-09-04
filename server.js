const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// === СОЗДАНИЕ ТАБЛИЦ ===
async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        ign TEXT,
        role TEXT DEFAULT 'user',
        banned BOOLEAN DEFAULT FALSE,
        verified BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        text TEXT NOT NULL,
        date TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS appeals (
        id SERIAL PRIMARY KEY,
        ign TEXT NOT NULL,
        reason TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        date TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS mods (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        why TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS forum_data (
        id INTEGER PRIMARY KEY DEFAULT 1,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Таблицы созданы');
  } catch (err) {
    console.error('❌ Ошибка создания таблиц:', err);
  }
}

// === СОЗДАНИЕ АДМИНИСТРАТОРА ===
async function createAdmin() {
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = 'tufhj'");
    if (result.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('zazazaa123123', 10);
      await pool.query(
        `INSERT INTO users (username, email, password, ign, role, verified) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['tufhj', 'admin@reallyanarchy.local', hashedPassword, 'tufhj', 'admin', true]
      );
      console.log('✅ Администратор создан');
    } else {
      console.log('✅ Администратор уже существует');
    }
  } catch (err) {
    console.error('❌ Ошибка создания администратора:', err);
  }
}

// === СОЗДАНИЕ ДЕФОЛТНЫХ ДАННЫХ ДЛЯ ФОРУМА ===
async function createDefaultForum() {
  try {
    const result = await pool.query('SELECT * FROM forum_data WHERE id = 1');
    if (result.rows.length === 0) {
      const defaultData = {
        categories: {
          info: { 
            name: 'Информация для игроков', 
            open: true, 
            topics: [
              { id: 1, title: 'Правила проекта', author: 'admin', replies: 2, last: '12.06.2026', views: 45 },
              { id: 2, title: 'Администрация проекта', author: 'admin', replies: 1, last: '11.06.2026', views: 30 },
              { id: 3, title: 'Список запрещённых модификаций', author: 'admin', replies: 2, last: '10.06.2026', views: 28 }
            ]
          },
          tech: { 
            name: 'Технический раздел', 
            open: true, 
            topics: [
              { id: 4, title: 'Ваши идеи и предложения', author: 'admin', replies: 54, last: '09.06.2026', views: 129 },
              { id: 5, title: 'Баги', author: 'admin', replies: 33, last: '08.06.2026', views: 71 }
            ]
          },
          complaints: { 
            name: 'Жалобы и апелляции', 
            open: true, 
            topics: [
              { id: 6, title: 'Жалобы на игроков', author: 'admin', replies: 119, last: '07.06.2026', views: 364 },
              { id: 7, title: 'Жалобы на модерацию', author: 'admin', replies: 35, last: '06.06.2026', views: 125 },
              { id: 8, title: 'Апелляции', author: 'admin', replies: 287, last: '05.06.2026', views: 956 }
            ]
          },
          chat: { 
            name: 'Общение', 
            open: true, 
            topics: [
              { id: 9, title: 'Оффтоп', author: 'admin', replies: 10, last: '04.06.2026', views: 4 },
              { id: 10, title: 'Координаты базы', author: 'admin', replies: 3, last: '03.06.2026', views: 1 },
              { id: 11, title: 'Поиск тимейта', author: 'admin', replies: 3, last: '02.06.2026', views: 1 },
              { id: 12, title: 'Постройки', author: 'admin', replies: 14, last: '01.06.2026', views: 4 }
            ]
          }
        },
        messages: {
          1: [{ author: 'admin', text: 'Добро пожаловать на сервер! Ознакомьтесь с правилами.', time: '12.06.2026' }],
          2: [{ author: 'admin', text: 'Состав администрации проекта.', time: '11.06.2026' }],
          3: [{ author: 'admin', text: 'Список запрещённых модов обновлён.', time: '10.06.2026' }],
          6: [{ author: 'admin', text: 'Жалоба на игрока X рассматривается.', time: '07.06.2026' }],
          8: [{ author: 'admin', text: 'Апелляция — To4no_Ne_Golem', time: '05.06.2026' }]
        },
        online: ['tufhj']
      };
      await pool.query('INSERT INTO forum_data (id, data) VALUES (1, $1)', [JSON.stringify(defaultData)]);
      console.log('✅ Дефолтные данные форума созданы');
    } else {
      console.log('✅ Данные форума уже существуют');
    }
  } catch (err) {
    console.error('❌ Ошибка создания данных форума:', err);
  }
}

// === ЗАПУСК СОЗДАНИЯ ===
createTables();
createAdmin();
createDefaultForum();

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function todayStr() {
  return new Date().toLocaleDateString('ru-RU', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

// ==================== API ====================

// === РЕГИСТРАЦИЯ ===
app.post('/api/register', async (req, res) => {
  const { username, password, ign } = req.body;
  try {
    const existing = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.json({ ok: false, msg: 'Пользователь уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, email, password, ign, verified) VALUES ($1, $2, $3, $4, $5)',
      [username, username + '@temp.local', hashedPassword, ign || username, true]
    );

    const user = await pool.query('SELECT username, role, ign FROM users WHERE username = $1', [username]);
    const token = jwt.sign(
      { username: user.rows[0].username, role: user.rows[0].role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );
    
    res.json({ ok: true, token, user: user.rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, msg: 'Ошибка сервера' });
  }
});

// === ВХОД ===
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.json({ ok: false, msg: 'Пользователь не найден' });
    }
    
    const user = result.rows[0];
    if (user.banned) {
      return res.json({ ok: false, msg: 'Аккаунт заблокирован' });
    }
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.json({ ok: false, msg: 'Неверный пароль' });
    }
    
    const token = jwt.sign(
      { username: user.username, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );
    
    res.json({ ok: true, token, user: { username: user.username, role: user.role, ign: user.ign } });
  } catch (err) {
    res.json({ ok: false, msg: 'Ошибка' });
  }
});

// === НОВОСТИ ===
app.get('/api/news', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM news ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/news', async (req, res) => {
  const { title, text } = req.body;
  try {
    const date = todayStr();
    await pool.query('INSERT INTO news (title, text, date) VALUES ($1, $2, $3)', [title, text, date]);
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
});

app.delete('/api/news/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM news WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
});

// === МОДЫ ===
app.get('/api/mods', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM mods ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/mods', async (req, res) => {
  const { name, why } = req.body;
  try {
    await pool.query('INSERT INTO mods (name, why) VALUES ($1, $2)', [name, why]);
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
});

app.delete('/api/mods/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM mods WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
});

// === АПЕЛЛЯЦИИ ===
app.get('/api/appeals', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM appeals ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/appeals', async (req, res) => {
  const { ign, reason, message } = req.body;
  try {
    const date = todayStr();
    await pool.query('INSERT INTO appeals (ign, reason, message, date) VALUES ($1, $2, $3, $4)', [ign, reason, message, date]);
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
});

app.put('/api/appeals/:id', async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query('UPDATE appeals SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
});

// === ПОЛЬЗОВАТЕЛИ ===
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, ign, role, banned, verified FROM users');
    res.json(result.rows);
  } catch (err) {
    res.json([]);
  }
});

app.put('/api/users/:username/ban', async (req, res) => {
  const { banned } = req.body;
  try {
    await pool.query('UPDATE users SET banned = $1 WHERE username = $2', [banned, req.params.username]);
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
});

// === ФОРУМ ===
app.get('/api/forum', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM forum_data WHERE id = 1');
    if (result.rows.length === 0) {
      const defaultData = {
        categories: {
          info: { name: 'Информация для игроков', open: true, topics: [] },
          tech: { name: 'Технический раздел', open: true, topics: [] },
          complaints: { name: 'Жалобы и апелляции', open: true, topics: [] },
          chat: { name: 'Общение', open: true, topics: [] }
        },
        messages: {},
        online: []
      };
      await pool.query('INSERT INTO forum_data (id, data) VALUES (1, $1)', [JSON.stringify(defaultData)]);
      res.json(defaultData);
    } else {
      res.json(JSON.parse(result.rows[0].data));
    }
  } catch (err) {
    console.error('Ошибка загрузки форума:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/forum', async (req, res) => {
  try {
    const { data } = req.body;
    await pool.query('UPDATE forum_data SET data = $1, updated_at = NOW() WHERE id = 1', [JSON.stringify(data)]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Ошибка сохранения форума:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// === СТАТИКА ===
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/rules.html', (req, res) => res.sendFile(path.join(__dirname, 'rules.html')));
app.get('/mods.html', (req, res) => res.sendFile(path.join(__dirname, 'mods.html')));
app.get('/appeal.html', (req, res) => res.sendFile(path.join(__dirname, 'appeal.html')));
app.get('/auth.html', (req, res) => res.sendFile(path.join(__dirname, 'auth.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/shop.html', (req, res) => res.sendFile(path.join(__dirname, 'shop.html')));
app.get('/forum.html', (req, res) => res.sendFile(path.join(__dirname, 'forum.html')));

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`🌐 Сайт доступен: https://reallyanarchy.onrender.com`);
});
