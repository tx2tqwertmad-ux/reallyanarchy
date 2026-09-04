const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Подключение к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
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
        verified BOOLEAN DEFAULT FALSE,
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
      
      CREATE TABLE IF NOT EXISTS verification_codes (
        email TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Таблицы созданы');
  } catch (err) {
    console.error('❌ Ошибка создания таблиц:', err);
  }
}

createTables();

// === НАСТРОЙКА ПОЧТЫ ===
const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function todayStr() {
  return new Date().toLocaleDateString('ru-RU', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

// === РЕГИСТРАЦИЯ ===
app.post('/api/register', async (req, res) => {
  const { username, email, password, ign } = req.body;
  try {
    const existing = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (existing.rows.length > 0) {
      return res.json({ ok: false, msg: 'Пользователь уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, email, password, ign, verified) VALUES ($1, $2, $3, $4, $5)',
      [username, email, hashedPassword, ign || username, false]
    );

    const code = generateCode();
    await pool.query(
      'INSERT INTO verification_codes (email, code) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET code = $2, created_at = NOW()',
      [email, code]
    );
    
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail({
        from: `"REALLYANARCHY" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Подтверждение регистрации',
        html: `<h2>Ваш код: <b>${code}</b></h2>`
      });
    }

    res.json({ ok: true, msg: 'Код отправлен на почту' });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, msg: 'Ошибка сервера' });
  }
});

// === ПОДТВЕРЖДЕНИЕ ПОЧТЫ ===
app.post('/api/verify', async (req, res) => {
  const { email, code } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM verification_codes WHERE email = $1 AND code = $2 AND created_at > NOW() - INTERVAL \'10 minutes\'',
      [email, code]
    );
    if (result.rows.length === 0) {
      return res.json({ ok: false, msg: 'Неверный код' });
    }
    await pool.query('UPDATE users SET verified = TRUE WHERE email = $1', [email]);
    await pool.query('DELETE FROM verification_codes WHERE email = $1', [email]);
    
    const user = await pool.query('SELECT username, role, ign FROM users WHERE email = $1', [email]);
    const token = jwt.sign(
      { username: user.rows[0].username, role: user.rows[0].role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );
    
    res.json({ ok: true, token, user: user.rows[0] });
  } catch (err) {
    res.json({ ok: false, msg: 'Ошибка' });
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
    if (!user.verified) {
      return res.json({ ok: false, msg: 'Подтвердите email' });
    }
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

// === СТАТИКА ===
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/rules.html', (req, res) => res.sendFile(path.join(__dirname, 'rules.html')));
app.get('/mods.html', (req, res) => res.sendFile(path.join(__dirname, 'mods.html')));
app.get('/appeal.html', (req, res) => res.sendFile(path.join(__dirname, 'appeal.html')));
app.get('/auth.html', (req, res) => res.sendFile(path.join(__dirname, 'auth.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/shop.html', (req, res) => res.sendFile(path.join(__dirname, 'shop.html')));

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`🌐 Сайт доступен: https://reallyanarchy.onrender.com`);
});
