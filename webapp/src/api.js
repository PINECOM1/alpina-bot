const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function getBookings(month) {
  const res = await fetch(`${BASE_URL}/bookings?month=${month}`);
  if (!res.ok) throw new Error('Ошибка загрузки броней');
  return res.json();
}

export async function getBookingsByDate(date, roomId) {
  let url = `${BASE_URL}/bookings?date=${date}`;
  if (roomId) url += `&room_id=${roomId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Ошибка загрузки броней');
  return res.json();
}

export async function createBooking({ room_id, date, start_time, end_time, user_id, user_name }) {
  const res = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room_id, date, start_time, end_time, user_id, user_name })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка бронирования');
  return data;
}

export async function deleteBooking(id, user_id) {
  const res = await fetch(`${BASE_URL}/bookings/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка удаления');
  return data;
}

export const ROOMS = [
  { id: 1, name: 'Переговорная №1', short: 'П-1', capacity: 4, color: '#007aff' },
  { id: 2, name: 'Переговорная №2', short: 'П-2', capacity: 8, color: '#5856d6' }
];
