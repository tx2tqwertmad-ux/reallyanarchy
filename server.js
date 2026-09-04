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
      
      -- ТАБЛИЦЫ ДЛЯ ФОРУМА
      CREATE TABLE IF NOT EXISTS forum_topics (
        id SERIAL PRIMARY KEY,
        section_key TEXT NOT NULL,
        subforum_key TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        replies INTEGER DEFAULT 0,
        last TEXT,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS forum_messages (
        id SERIAL PRIMARY KEY,
        topic_id INTEGER NOT NULL,
        author TEXT NOT NULL,
        text TEXT NOT NULL,
        time TEXT,
        created_at TIMESTAMP DEFAULT NOW()
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

createTables();
createAdmin();

function todayStr() {
  return new Date().toLocaleDateString('ru-RU', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

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

// ============================================================
// === ФОРУМ — API ===
// ============================================================

// === ПОЛУЧИТЬ ВСЕ ТЕМЫ ДЛЯ РАЗДЕЛА ===
app.get('/api/forum/topics/:sectionKey/:subforumKey', async (req, res) => {
  const { sectionKey, subforumKey } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM forum_topics WHERE section_key = $1 AND subforum_key = $2 ORDER BY created_at DESC',
      [sectionKey, subforumKey]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

// === СОЗДАТЬ ТЕМУ ===
app.post('/api/forum/topics', async (req, res) => {
  const { sectionKey, subforumKey, title, author, text } = req.body;
  try {
    const now = new Date().toLocaleDateString('ru-RU');
    const result = await pool.query(
      'INSERT INTO forum_topics (section_key, subforum_key, title, author, last) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [sectionKey, subforumKey, title, author, now]
    );
    const topicId = result.rows[0].id;
    await pool.query(
      'INSERT INTO forum_messages (topic_id, author, text, time) VALUES ($1, $2, $3, $4)',
      [topicId, author, text, now]
    );
    res.json({ ok: true, id: topicId });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, msg: 'Ошибка создания темы' });
  }
});

// === ПОЛУЧИТЬ СООБЩЕНИЯ ТЕМЫ ===
app.get('/api/forum/messages/:topicId', async (req, res) => {
  const { topicId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM forum_messages WHERE topic_id = $1 ORDER BY created_at',
      [topicId]
    );
    res.json(result.rows);
  } catch (err) {
    res.json([]);
  }
});

// === ДОБАВИТЬ СООБЩЕНИЕ В ТЕМУ ===
app.post('/api/forum/messages', async (req, res) => {
  const { topicId, author, text, time } = req.body;
  try {
    await pool.query(
      'INSERT INTO forum_messages (topic_id, author, text, time) VALUES ($1, $2, $3, $4)',
      [topicId, author, text, time]
    );
    await pool.query(
      'UPDATE forum_topics SET replies = replies + 1, last = $1 WHERE id = $2',
      [time.split(' ')[0], topicId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false });
  }
});

// === ПОЛУЧИТЬ СТАТИСТИКУ ФОРУМА ===
app.get('/api/forum/stats', async (req, res) => {
  try {
    const topics = await pool.query('SELECT COUNT(*) FROM forum_topics');
    const messages = await pool.query('SELECT COUNT(*) FROM forum_messages');
    const users = await pool.query('SELECT COUNT(*) FROM users');
    res.json({
      topics: parseInt(topics.rows[0].count),
      messages: parseInt(messages.rows[0].count),
      users: parseInt(users.rows[0].count)
    });
  } catch (err) {
    res.json({ topics: 0, messages: 0, users: 0 });
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
app.get('/profile.html', (req, res) => res.sendFile(path.join(__dirname, 'profile.html')));
app.get('/forum.html', (req, res) => res.sendFile(path.join(__dirname, 'forum.html')));

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`🌐 Сайт доступен: https://reallyanarchy.onrender.com`);
});
