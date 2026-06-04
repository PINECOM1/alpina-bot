import { useState } from 'react';
import { createBooking, ROOMS } from '../api.js';
import styles from './BookingModal.module.css';

const MONTHS_RU = ['января','февраля','марта','апреля','мая','июня',
  'июля','августа','сентября','октября','ноября','декабря'];

const TIMES = [];
for (let h = 8; h <= 19; h++) {
  TIMES.push(`${String(h).padStart(2,'0')}:00`);
  if (h < 19) TIMES.push(`${String(h).padStart(2,'0')}:30`);
}

function toMins(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function fromMins(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

export default function BookingModal({ slot, date, userId, userName, onConfirmed, onBack }) {
  const [startTime, setStartTime] = useState(slot.start_time || '09:00');
  const [endTime, setEndTime]     = useState(slot.end_time   || '10:00');
  const [step, setStep]           = useState('form'); // form | confirm
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const [y, m, d] = date.split('-').map(Number);
  const dateLabel = `${d} ${MONTHS_RU[m - 1]}`;
  const room = ROOMS.find(r => r.id === slot.room_id);

  const endTimes = TIMES.filter(t => toMins(t) > toMins(startTime));

  const handleStartChange = (e) => {
    const val = e.target.value;
    setStartTime(val);
    if (toMins(endTime) <= toMins(val)) {
      setEndTime(fromMins(toMins(val) + 60));
    }
    setError('');
  };

  const handleNext = () => {
    if (toMins(endTime) <= toMins(startTime)) {
      setError('Время окончания должно быть позже начала');
      return;
    }
    setError('');
    setStep('confirm');
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const booking = await createBooking({
        room_id: slot.room_id,
        date,
        start_time: startTime,
        end_time: endTime,
        user_id: userId,
        user_name: userName
      });
      onConfirmed({ ...booking, room_name: room?.name });
    } catch (e) {
      setError(e.message);
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.back} onClick={step === 'confirm' ? () => setStep('form') : onBack}>
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M8.5 1L1.5 8L8.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className={styles.headerTitle}>Бронирование</div>
        <div className={styles.spacer} />
      </div>

      <div className={styles.content}>
        {/* Room card */}
        <div className={styles.roomCard} style={{ '--room-color': room?.color }}>
          <div className={styles.roomIcon}>🏢</div>
          <div>
            <div className={styles.roomName}>{room?.name}</div>
            <div className={styles.roomDate}>{dateLabel}</div>
          </div>
        </div>

        {step === 'form' && (
          <div className={styles.form}>
            <div className={styles.timeRow}>
              <div className={styles.timeField}>
                <label className={styles.label}>Начало</label>
                <select
                  className={styles.select}
                  value={startTime}
                  onChange={handleStartChange}
                >
                  {TIMES.filter((_, i, arr) => arr.indexOf(_) === i).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className={styles.timeDivider}>—</div>
              <div className={styles.timeField}>
                <label className={styles.label}>Конец</label>
                <select
                  className={styles.select}
                  value={endTime}
                  onChange={e => { setEndTime(e.target.value); setError(''); }}
                >
                  {endTimes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duration badge */}
            <div className={styles.duration}>
              ⏱ {getDuration(startTime, endTime)}
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              className={styles.primaryBtn}
              style={{ background: room?.color }}
              onClick={handleNext}
            >
              Далее
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div className={styles.confirm}>
            <div className={styles.confirmCard}>
              <div className={styles.confirmRow}>
                <span className={styles.confirmLabel}>Комната</span>
                <span className={styles.confirmValue}>{room?.name}</span>
              </div>
              <div className={styles.confirmSep} />
              <div className={styles.confirmRow}>
                <span className={styles.confirmLabel}>Дата</span>
                <span className={styles.confirmValue}>{dateLabel}</span>
              </div>
              <div className={styles.confirmSep} />
              <div className={styles.confirmRow}>
                <span className={styles.confirmLabel}>Время</span>
                <span className={styles.confirmValue}>{startTime} — {endTime}</span>
              </div>
              <div className={styles.confirmSep} />
              <div className={styles.confirmRow}>
                <span className={styles.confirmLabel}>Длительность</span>
                <span className={styles.confirmValue}>{getDuration(startTime, endTime)}</span>
              </div>
              <div className={styles.confirmSep} />
              <div className={styles.confirmRow}>
                <span className={styles.confirmLabel}>Бронирует</span>
                <span className={styles.confirmValue}>{userName}</span>
              </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              className={styles.primaryBtn}
              style={{ background: room?.color, opacity: loading ? 0.7 : 1 }}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? 'Бронирую...' : 'Подтвердить'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getDuration(start, end) {
  const mins = toMins(end) - toMins(start);
  if (mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}
