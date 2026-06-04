import { useState, useMemo } from 'react';
import { ROOMS } from '../api.js';
import styles from './Calendar.module.css';

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

export default function Calendar({ bookings, onDaySelect, onMonthChange }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [baseMonth, setBaseMonth] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const months = useMemo(() => {
    return [0, 1, 2].map(offset => {
      const d = new Date(baseMonth.y, baseMonth.m + offset, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, [baseMonth]);

  const goBack = () => {
    const prev = new Date(baseMonth.y, baseMonth.m - 1, 1);
    if (prev >= new Date(today.getFullYear(), today.getMonth(), 1)) {
      const newBase = { y: prev.getFullYear(), m: prev.getMonth() };
      setBaseMonth(newBase);
      onMonthChange?.(`${newBase.y}-${String(newBase.m + 1).padStart(2, '0')}`);
    }
  };

  const goForward = () => {
    const next = new Date(baseMonth.y, baseMonth.m + 1, 1);
    const newBase = { y: next.getFullYear(), m: next.getMonth() };
    setBaseMonth(newBase);
    onMonthChange?.(`${newBase.y}-${String(newBase.m + 1).padStart(2, '0')}`);
  };

  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      if (!map[b.date]) map[b.date] = [];
      map[b.date].push(b);
    });
    return map;
  }, [bookings]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Переговорные</h1>
          <div className={styles.navButtons}>
            <button className={styles.navBtn} onClick={goBack}>‹</button>
            <button className={styles.navBtn} onClick={goForward}>›</button>
          </div>
        </div>
        {/* Legend */}
        <div className={styles.legend}>
          {ROOMS.map(r => (
            <div key={r.id} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: r.color }} />
              <span>{r.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Months */}
      <div className={styles.months}>
        {months.map(({ year, month }) => (
          <MonthGrid
            key={`${year}-${month}`}
            year={year}
            month={month}
            today={today}
            bookingsByDate={bookingsByDate}
            onDaySelect={onDaySelect}
          />
        ))}
      </div>
    </div>
  );
}

function MonthGrid({ year, month, today, bookingsByDate, onDaySelect }) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday-based week (0=Mon, 6=Sun)
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <div className={styles.month}>
      <div className={styles.monthName}>
        {MONTHS_RU[month]} {year}
      </div>
      <div className={styles.weekDays}>
        {DAYS_SHORT.map(d => (
          <div key={d} className={styles.weekDay}>{d}</div>
        ))}
      </div>
      <div className={styles.grid}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className={styles.empty} />;

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const cellDate = new Date(year, month, day);
          const isPast = cellDate < today;
          const isToday = cellDate.getTime() === today.getTime();
          const dayBookings = bookingsByDate[dateStr] || [];

          // Get unique room ids booked this day
          const bookedRooms = [...new Set(dayBookings.map(b => b.room_id))];

          return (
            <button
              key={dateStr}
              className={`${styles.day} ${isPast ? styles.past : ''} ${isToday ? styles.today : ''}`}
              onClick={() => !isPast && onDaySelect(dateStr)}
              disabled={isPast}
            >
              <span className={styles.dayNum}>{day}</span>
              {bookedRooms.length > 0 && (
                <div className={styles.dots}>
                  {bookedRooms.map(roomId => {
                    const room = ROOMS.find(r => r.id === roomId);
                    return (
                      <span
                        key={roomId}
                        className={styles.dot}
                        style={{ background: room?.color || '#007aff' }}
                      />
                    );
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
