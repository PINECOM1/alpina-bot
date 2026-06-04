import { useEffect, useState } from 'react';
import { ROOMS } from '../api.js';
import styles from './SuccessScreen.module.css';

const MONTHS_RU = ['января','февраля','марта','апреля','мая','июня',
  'июля','августа','сентября','октября','ноября','декабря'];

export default function SuccessScreen({ booking, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    requestAnimationFrame(() => setVisible(true));
    // Auto-close after 4 seconds
    const timer = setTimeout(onDone, 4000);
    return () => clearTimeout(timer);
  }, []);

  const [y, m, d] = booking.date.split('-').map(Number);
  const dateLabel = `${d} ${MONTHS_RU[m - 1]}`;
  const room = ROOMS.find(r => r.id === booking.room_id);

  return (
    <div className={`${styles.overlay} ${visible ? styles.visible : ''}`}>
      <div className={`${styles.card} ${visible ? styles.cardIn : ''}`}>
        {/* Checkmark */}
        <div className={styles.iconWrap} style={{ background: room?.color || '#007aff' }}>
          <svg className={styles.check} viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="26" r="25" stroke="white" strokeWidth="2" opacity="0.3"/>
            <path
              className={styles.checkPath}
              d="M14 26L22 34L38 18"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>

        {/* Title */}
        <div className={styles.title}>ЗАБРОНИРОВАНО</div>

        {/* Subtitle */}
        <div className={styles.subtitle}>
          {dateLabel}&nbsp;&nbsp;{booking.start_time} — {booking.end_time}
        </div>

        {/* Room badge */}
        <div className={styles.roomBadge} style={{ color: room?.color }}>
          {room?.name}
        </div>

        {/* Close button */}
        <button
          className={styles.closeBtn}
          onClick={onDone}
        >
          Готово
        </button>
      </div>
    </div>
  );
}
