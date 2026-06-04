const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- DB SETUP ---
const db = new sqlite3.Database(path.join(__dirname, 'bookings.db'));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_date ON bookings(date)`);
});

const ROOMS = [
  { id: 1, name: 'Переговорная №1', capacity: 4, color: '#007aff' },
  { id: 2, name: 'Переговорная №2', capacity: 8, color: '#5856d6' }
];

// --- HELPERS ---
function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastInsertRowid: this.lastID });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
}

async function hasConflict(roomId, date, startTime, endTime, excludeId = null) {
  let sql = `SELECT * FROM bookings WHERE room_id = ? AND date = ?`;
  const params = [roomId, date];
  if (excludeId) { sql += ` AND id != ?`; params.push(excludeId); }

  const existing = await dbAll(sql, params);
  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);

  return existing.some(b => {
    const bStart = timeToMinutes(b.start_time);
    const bEnd = timeToMinutes(b.end_time);
    return newStart < bEnd && newEnd > bStart;
  });
}

// --- ROUTES ---

app.get('/rooms', (req, res) => {
  res.json(ROOMS);
});

app.get('/bookings', async (req, res) => {
  try {
    const { date, room_id, month } = req.query;
    let sql = 'SELECT * FROM bookings WHERE 1=1';
    const params = [];

    if (date) { sql += ' AND date = ?'; params.push(date); }
    else if (month) { sql += ' AND date LIKE ?'; params.push(`${month}%`); }
    if (room_id) { sql += ' AND room_id = ?'; params.push(room_id); }

    sql += ' ORDER BY date, start_time';
    const bookings = await dbAll(sql, params);
    res.json(bookings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/bookings', async (req, res) => {
  try {
    const { room_id, date, start_time, end_time, user_id, user_name } = req.body;

    if (!room_id || !date || !start_time || !end_time || !user_id) {
      return res.status(400).json({ error: 'Заполните все поля' });
    }
    if (timeToMinutes(start_time) >= timeToMinutes(end_time)) {
      return res.status(400).json({ error: 'Время окончания должно быть позже начала' });
    }
    if (!ROOMS.find(r => r.id === Number(room_id))) {
      return res.status(400).json({ error: 'Комната не найдена' });
    }
    if (await hasConflict(room_id, date, start_time, end_time)) {
      return res.status(409).json({ error: 'Это время уже занято' });
    }

    const result = await dbRun(
      `INSERT INTO bookings (room_id, date, start_time, end_time, user_id, user_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [room_id, date, start_time, end_time, user_id, user_name || 'Пользователь']
    );

    const booking = await dbGet('SELECT * FROM bookings WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(booking);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    const booking = await dbGet('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!booking) return res.status(404).json({ error: 'Бронь не найдена' });
    if (booking.user_id !== user_id) return res.status(403).json({ error: 'Нет прав для удаления' });
    await dbRun('DELETE FROM bookings WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Alpina Booking Server запущен на порту ${PORT}`);
});
