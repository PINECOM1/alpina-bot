import { useState } from 'react';
import { ROOMS } from '../api.js';
import styles from './DayView.module.css';

const MONTHS_RU = ['января','февраля','марта','апреля','мая','июня',
  'июля','августа','сентября','октября','ноября','декабря'];
const DAYS_RU = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];

const HOURS = Array.from({ length: 22 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
}); // 08:00 - 18:30

export default function DayView({ date, bookings, onBook, onBack }) {
  const [selectedRoom, setSelectedRoom] = useState(1);

  const [y, m, d] = date.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayName = DAYS_RU[dateObj.getDay()];
  const dateLabel = `${d} ${MONTHS_RU[m - 1]}`;

  const roomBookings = bookings.filter(b => b.room_id === selectedRoom);

  function isSlotBusy(time) {
    return roomBookings.some(b => {
      const t = toMins(time);
      return t >= toMins(b.start_time) && t < toMins(b.end_time);
    });
  }

  function getSlotBooking(time) {
    return roomBookings.find(b => toMins(b.start_time) === toMins(time));
  }

  function handleSlotPress(time) {
    if (isSlotBusy(time)) return;
    const endMins = toMins(time) + 60;
    const endH = Math.floor(endMins / 60);
    const endM = endMins % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    onBook({
      room_id: selectedRoom,
      room_name: ROOMS.find(r => r.id === selectedRoom)?.name,
      start_time: time,
      end_time: endTime
    });
  }

  const room = ROOMS.find(r => r.id === selectedRoom);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.back} onClick={onBack}>
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M8.5 1L1.5 8L8.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className={styles.headerInfo}>
          <div className={styles.dayName}>{dayName}</div>
          <div className={styles.dateLabel}>{dateLabel}</div>
        </div>
        <div className={styles.spacer} />
      </div>

      {/* Room Selector */}
      <div className={styles.roomSelector}>
        {ROOMS.map(r => (
          <button
            key={r.id}
            className={`${styles.roomTab} ${selectedRoom === r.id ? styles.activeRoom : ''}`}
            style={selectedRoom === r.id ? { '--room-color': r.color } : {}}
            onClick={() => setSelectedRoom(r.id)}
          >
            <span className={styles.roomTabDot} style={{ background: r.color }} />
            {r.name}
          </button>
        ))}
      </div>

      {/* Capacity hint */}
      <div className={styles.capacityHint}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        До {room?.capacity} человек
      </div>

      {/* Time Slots */}
      <div className={styles.slots}>
        {HOURS.map(time => {
          const busy = isSlotBusy(time);
          const booking = getSlotBooking(time);

          return (
            <button
              key={time}
              className={`${styles.slot} ${busy ? styles.busy : styles.free}`}
              onClick={() => handleSlotPress(time)}
              disabled={busy}
            >
              <span className={styles.slotTime}>{time}</span>
              {booking ? (
                <div className={styles.bookingInfo}>
                  <span className={styles.bookingName}>{booking.user_name}</span>
                  <span className={styles.bookingRange}>{booking.start_time}–{booking.end_time}</span>
                </div>
              ) : busy ? (
                <span className={styles.busyLabel}>Занято</span>
              ) : (
                <span className={styles.freeLabel}>Нажмите, чтобы забронировать</span>
              )}
              {!busy && (
                <div className={styles.slotArrow} style={{ color: room.color }}>+</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function toMins(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
