import { useState, useEffect, useCallback } from 'react';
import Calendar from './components/Calendar.jsx';
import DayView from './components/DayView.jsx';
import BookingModal from './components/BookingModal.jsx';
import SuccessScreen from './components/SuccessScreen.jsx';
import MyBookings from './components/MyBookings.jsx';
import { getBookings } from './api.js';
import styles from './App.module.css';

const tg = window.Telegram?.WebApp;

export default function App() {
  const [tab, setTab] = useState('calendar'); // calendar | my
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState('calendar'); // calendar | day | booking | success
  const [bookings, setBookings] = useState([]);
  const [loadingMonths, setLoadingMonths] = useState({});
  const [pendingBooking, setPendingBooking] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [currentMonthKey, setCurrentMonthKey] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#f2f2f7');
      tg.setBackgroundColor('#f2f2f7');
    }
  }, []);

  const loadMonth = useCallback(async (monthKey) => {
    if (loadingMonths[monthKey]) return;
    setLoadingMonths(prev => ({ ...prev, [monthKey]: true }));
    try {
      const data = await getBookings(monthKey);
      setBookings(prev => {
        const filtered = prev.filter(b => !b.date.startsWith(monthKey));
        return [...filtered, ...data];
      });
    } catch (e) {
      console.error('Load month error:', e);
    } finally {
      setLoadingMonths(prev => ({ ...prev, [monthKey]: false }));
    }
  }, [loadingMonths]);

  useEffect(() => {
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      loadMonth(key);
    }
  }, []);

  const handleMonthChange = (monthKey) => {
    setCurrentMonthKey(monthKey);
    loadMonth(monthKey);
  };

  const handleDaySelect = (date) => {
    setSelectedDate(date);
    setView('day');
  };

  const handleBookingStart = (slot) => {
    setPendingBooking(slot);
    setView('booking');
  };

  const handleBookingConfirmed = (booking) => {
    setBookings(prev => [...prev, booking]);
    setConfirmedBooking(booking);
    setView('success');
    if (tg) {
      tg.sendData(JSON.stringify({
        type: 'booking_confirmed',
        room_name: booking.room_name,
        date: formatDateRu(booking.date),
        start_time: booking.start_time,
        end_time: booking.end_time
      }));
    }
  };

  const handleBookingDeleted = (id) => {
    setBookings(prev => prev.filter(b => b.id !== id));
  };

  const handleBack = () => {
    if (view === 'day') setView('calendar');
    else if (view === 'booking') setView('day');
    else if (view === 'success') {
      setView('calendar');
      setConfirmedBooking(null);
      setPendingBooking(null);
    }
  };

  // Telegram back button
  useEffect(() => {
    if (!tg) return;
    const isNested = view !== 'calendar' || tab === 'my';
    if (isNested) {
      tg.BackButton.show();
      const handler = () => {
        if (view !== 'calendar') handleBack();
        else setTab('calendar');
      };
      tg.BackButton.onClick(handler);
      return () => tg.BackButton.offClick(handler);
    } else {
      tg.BackButton.hide();
    }
  }, [view, tab]);

  const userId = tg?.initDataUnsafe?.user?.id?.toString() || 'dev-user';
  const userName = tg?.initDataUnsafe?.user?.first_name || 'Пользователь';

  // Hide tab bar when in sub-views
  const showTabBar = view === 'calendar';

  return (
    <div className={styles.app}>
      <div className={styles.content}>
        {/* Calendar tab */}
        {tab === 'calendar' && (
          <>
            {view === 'calendar' && (
              <Calendar
                bookings={bookings}
                onDaySelect={handleDaySelect}
                onMonthChange={handleMonthChange}
              />
            )}
            {view === 'day' && selectedDate && (
              <DayView
                date={selectedDate}
                bookings={bookings.filter(b => b.date === selectedDate)}
                onBook={handleBookingStart}
                onBack={handleBack}
              />
            )}
            {view === 'booking' && pendingBooking && (
              <BookingModal
                slot={pendingBooking}
                date={selectedDate}
                userId={userId}
                userName={userName}
                onConfirmed={handleBookingConfirmed}
                onBack={handleBack}
              />
            )}
            {view === 'success' && confirmedBooking && (
              <SuccessScreen
                booking={confirmedBooking}
                onDone={handleBack}
              />
            )}
          </>
        )}

        {/* My Bookings tab */}
        {tab === 'my' && (
          <MyBookings
            bookings={bookings}
            userId={userId}
            onDeleted={handleBookingDeleted}
          />
        )}
      </div>

      {/* Tab Bar */}
      {showTabBar && (
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabItem} ${tab === 'calendar' ? styles.tabActive : ''}`}
            onClick={() => setTab('calendar')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M3 9h18" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="8" cy="14" r="1" fill="currentColor"/>
              <circle cx="12" cy="14" r="1" fill="currentColor"/>
              <circle cx="16" cy="14" r="1" fill="currentColor"/>
            </svg>
            <span>Календарь</span>
          </button>
          <button
            className={`${styles.tabItem} ${tab === 'my' ? styles.tabActive : ''}`}
            onClick={() => setTab('my')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span>Мои брони</span>
          </button>
        </div>
      )}
    </div>
  );
}

function formatDateRu(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const months = ['января','февраля','марта','апреля','мая','июня',
    'июля','августа','сентября','октября','ноября','декабря'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}
