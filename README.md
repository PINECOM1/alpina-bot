# 🏢 Alpina — Бот бронирования переговорных комнат

Telegram Mini App для бронирования переговорных комнат с iOS-подобным интерфейсом календаря.

## Структура проекта

```
alpina-bot/
├── bot/          # Telegram бот (Telegraf.js)
├── server/       # REST API + SQLite база данных (Express)
├── webapp/       # Фронтенд — календарь (React + Vite)
└── docker-compose.yml
```

## Быстрый старт (локальная разработка)

### 1. Установи зависимости

```bash
# Server
cd server && npm install

# Bot
cd ../bot && npm install

# Webapp
cd ../webapp && npm install
```

### 2. Настрой переменные окружения

**bot/.env**
```
BOT_TOKEN=твой_токен_от_BotFather
WEBAPP_URL=http://localhost:5173
```

**webapp/.env**
```
VITE_API_URL=http://localhost:3001
```

### 3. Запусти все три части (в разных терминалах)

```bash
# Терминал 1 — сервер
cd server && npm run dev

# Терминал 2 — webapp
cd webapp && npm run dev

# Терминал 3 — бот
cd bot && npm run dev
```

### 4. Получи токен бота

1. Открой [@BotFather](https://t.me/BotFather) в Telegram
2. Напиши `/newbot` и следуй инструкциям
3. Скопируй токен в `bot/.env`

## Деплой на сервер

### Шаг 1 — Задеплой webapp (бесплатно на Vercel)

```bash
cd webapp
npm run build
# Загрузи папку dist на Vercel / Netlify / любой хостинг
```

### Шаг 2 — Запусти сервер и бот

```bash
# Создай .env в корне
BOT_TOKEN=твой_токен
WEBAPP_URL=https://твой-webapp.vercel.app

# Запусти через docker-compose
docker-compose up -d
```

### Шаг 3 — Настрой CORS

В `server/index.js` замени:
```js
app.use(cors());
```
на:
```js
app.use(cors({ origin: 'https://твой-webapp.vercel.app' }));
```

## Переговорные комнаты

| Комната | Вместимость | Цвет |
|---------|-------------|------|
| Переговорная №1 | 6 человек | Синий |
| Переговорная №2 | 10 человек | Фиолетовый |

## API эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/rooms` | Список комнат |
| GET | `/bookings?month=2025-06` | Брони за месяц |
| GET | `/bookings?date=2025-06-10` | Брони за день |
| POST | `/bookings` | Создать бронь |
| DELETE | `/bookings/:id` | Удалить бронь |

## Как это работает

1. Пользователь открывает бота в Telegram
2. Нажимает кнопку **📅 Открыть календарь**
3. Видит iOS-подобный календарь на 3 месяца
4. Выбирает день → видит занятые и свободные слоты
5. Нажимает на свободный слот → выбирает точное время
6. Подтверждает бронь
7. Видит экран **ЗАБРОНИРОВАНО** с датой и временем
8. Бронь мгновенно видна всем остальным пользователям
