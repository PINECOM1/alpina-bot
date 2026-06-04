import { useState } from 'react';
import { deleteBooking, ROOMS } from '../api.js';
import styles from './MyBookings.module.css';

const MONTHS_RU = ['января','февраля','марта','апреля','мая','июня',
  'июля','августа','сентября','октября','ноября','декабря'];

function formatDateRu(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MONTHS_RU[m - 1]} ${y}`;
}

function isPast(dateStr, endTime) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = endTime.split(':').map(Number);
  const end = new Date(y, m - 1, d, h, min);
  return end < new Date();
}

export default function MyBookings({ bookings, userId, onDeleted }) {
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [error, setError] = useState('');

  const myBookings = bookings
    .filter(b => b.user_id === userId)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.start_time.localeCompare(b.start_time);
    });

  const upcoming = myBookings.filter(b => !isPast(b.date, b.end_time));
  const past = myBookings.filter(b => isPast(b.date, b.end_time));

  const handleDelete = async (id) => {
    setDeletingId(id);
    setError('');
    try {
      await deleteBooking(id, userId);
      onDeleted(id);
      setConfirmId(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Мои бронирования</h1>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {myBookings.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📅</div>
          <div className={styles.emptyTitle}>Нет бронирований</div>
          <div className={styles.emptyText}>Перейдите в Календарь, чтобы забронировать переговорную</div>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Предстоящие</div>
              <div className={styles.list}>
                {upcoming.map(b => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    past={false}
                    confirmId={confirmId}
                    deletingId={deletingId}
                    onAskConfirm={setConfirmId}
                    onDelete={handleDelete}
                    onCancelConfirm={() => setConfirmId(null)}
                  />
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Прошедшие</div>
              <div className={styles.list}>
                {past.map(b => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    past={true}
                    confirmId={confirmId}
                    deletingId={deletingId}
                    onAskConfirm={setConfirmId}
                    onDelete={handleDelete}
                    onCancelConfirm={() => setConfirmId(null)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BookingCard({ booking, past, confirmId, deletingId, onAskConfirm, onDelete, onCancelConfirm }) {
  const room = ROOMS.find(r => r.id === booking.room_id);
  const isConfirming = confirmId === booking.id;
  const isDeleting = deletingId === booking.id;

  return (
    <div className={`${styles.card} ${past ? styles.cardPast : ''}`}>
      <div className={styles.cardAccent} style={{ background: room?.color }} />
      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <div className={styles.roomName}>{room?.name}</div>
          {!past && !isConfirming && (
            <button
              className={styles.deleteBtn}
              onClick={() => onAskConfirm(booking.id)}
            >
              Отменить
            </button>
          )}
        </div>
        <div className={styles.cardDate}>{formatDateRu(booking.date)}</div>
        <div className={styles.cardTime}>
          🕐 {booking.start_time} — {booking.end_time}
        </div>

        {isConfirming && (
          <div className={styles.confirmRow}>
            <span className={styles.confirmText}>Отменить бронирование?</span>
            <div className={styles.confirmBtns}>
              <button className={styles.cancelBtn} onClick={onCancelConfirm}>Нет</button>
              <button
                className={styles.confirmDeleteBtn}
                onClick={() => onDelete(booking.id)}
                disabled={isDeleting}
              >
                {isDeleting ? '...' : 'Да'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
