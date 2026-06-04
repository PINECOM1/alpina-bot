const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const ROOMS = [
  { id: 1, name: 'Переговорная №1', capacity: 4, color: '#007aff' },
  { id: 2, name: 'Переговорная №2', capacity: 8, color: '#5856d6' }
];

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

async function dbAll(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

async function dbGet(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0];
}

async function hasConflict(roomId, date, startTime, endTime, excludeId = null) {
  let sql = `
    SELECT *
    FROM bookings
    WHERE room_id = $1
      AND date = $2
  `;

  const params = [roomId, date];

  if (excludeId) {
    sql += ` AND id != $3`;
    params.push(excludeId);
  }

  const existing = await dbAll(sql, params);

  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);

  return existing.some(b => {
    const bStart = timeToMinutes(b.start_time);
    const bEnd = timeToMinutes(b.end_time);

    return newStart < bEnd && newEnd > bStart;
  });
}

app.get('/rooms', (req, res) => {
  res.json(ROOMS);
});

app.get('/bookings', async (req, res) => {
  try {
    const { date, room_id, month } = req.query;

    let sql = `
      SELECT *
      FROM bookings
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (date) {
      sql += ` AND date = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    } else if (month) {
      sql += ` AND date LIKE $${paramIndex}`;
      params.push(`${month}%`);
      paramIndex++;
    }

    if (room_id) {
      sql += ` AND room_id = $${paramIndex}`;
      params.push(room_id);
      paramIndex++;
    }

    sql += ` ORDER BY date, start_time`;

    const bookings = await dbAll(sql, params);

    res.json(bookings);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/bookings', async (req, res) => {
  try {
    const {
      room_id,
      date,
      start_time,
      end_time,
      user_id,
      user_name
    } = req.body;

    if (
      !room_id ||
      !date ||
      !start_time ||
      !end_time ||
      !user_id
    ) {
      return res.status(400).json({
        error: 'Заполните все поля'
      });
    }

    if (
      timeToMinutes(start_time) >=
      timeToMinutes(end_time)
    ) {
      return res.status(400).json({
        error: 'Время окончания должно быть позже начала'
      });
    }

    if (!ROOMS.find(r => r.id === Number(room_id))) {
      return res.status(400).json({
        error: 'Комната не найдена'
      });
    }

    if (
      await hasConflict(
        room_id,
        date,
        start_time,
        end_time
      )
    ) {
      return res.status(409).json({
        error: 'Это время уже занято'
      });
    }

    const result = await pool.query(
      `
      INSERT INTO bookings
      (
        room_id,
        date,
        start_time,
        end_time,
        user_id,
        user_name
      )
      VALUES
      ($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [
        room_id,
        date,
        start_time,
        end_time,
        user_id,
        user_name || 'Пользователь'
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    const booking = await dbGet(
      'SELECT * FROM bookings WHERE id = $1',
      [id]
    );

    if (!booking) {
      return res.status(404).json({
        error: 'Бронь не найдена'
      });
    }

    if (booking.user_id !== user_id) {
      return res.status(403).json({
        error: 'Нет прав для удаления'
      });
    }

    await pool.query(
      'DELETE FROM bookings WHERE id = $1',
      [id]
    );

    res.json({
      success: true
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');

    res.json({
      status: 'ok',
      database: 'supabase'
    });
  } catch (e) {
    res.status(500).json({
      status: 'error',
      error: e.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Alpina Booking Server запущен на порту ${PORT}`);
});
