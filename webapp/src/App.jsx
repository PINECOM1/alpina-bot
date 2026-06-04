import { useState, useEffect, useCallback } from 'react';
import Calendar from './components/Calendar.jsx';
import DayView from './components/DayView.jsx';
import BookingModal from './components/BookingModal.jsx';
import SuccessScreen from './components/SuccessScreen.jsx';
import { getBookings } from './api.js';
import styles from './App.module.css';

const tg = window.Telegram?.WebApp;

export default function App() {
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

  // Init Telegram WebApp
  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#f2f2f7');
      tg.setBackgroundColor('#f2f2f7');
    }
  }, []);

  // Load bookings for a month
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

  // Load initial 3 months
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
    // Send data back to Telegram bot
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

  const handleBack = () => {
    if (view === 'day') setView('calendar');
    else if (view === 'booking') setView('day');
    else if (view === 'success') {
      setView('calendar');
      setConfirmedBooking(null);
      setPendingBooking(null);
    }
  };

  // Update Telegram back button
  useEffect(() => {
    if (!tg) return;
    if (view !== 'calendar') {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBack);
    } else {
      tg.BackButton.hide();
    }
    return () => tg.BackButton.offClick(handleBack);
  }, [view]);

  const userId = tg?.initDataUnsafe?.user?.id?.toString() || 'dev-user';
  const userName = tg?.initDataUnsafe?.user?.first_name || 'Пользователь';

  return (
    <div className={styles.app}>
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
    </div>
  );
}

function formatDateRu(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const months = ['января','февраля','марта','апреля','мая','июня',
    'июля','августа','сентября','октября','ноября','декабря'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}
