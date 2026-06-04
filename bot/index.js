require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://your-webapp-url.com';

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN не указан в .env');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// /start command
bot.start((ctx) => {
  const firstName = ctx.from.first_name || 'Коллега';
  ctx.reply(
    `👋 Привет, ${firstName}!\n\nЯ помогу забронировать переговорную комнату в Alpina.\n\nНажми кнопку ниже, чтобы открыть календарь бронирований:`,
    Markup.keyboard([
      [Markup.button.webApp('📅 Открыть календарь', WEBAPP_URL)]
    ]).resize()
  );
});

// /help command
bot.help((ctx) => {
  ctx.reply(
    `📌 *Как пользоваться ботом:*\n\n` +
    `1. Нажми «📅 Открыть календарь»\n` +
    `2. Выбери день в календаре\n` +
    `3. Выбери комнату и время\n` +
    `4. Подтверди бронирование\n\n` +
    `*Переговорные комнаты:*\n` +
    `• Переговорная №1 — до 6 человек\n` +
    `• Переговорная №2 — до 10 человек`,
    { parse_mode: 'Markdown' }
  );
});

// Handle web app data (confirmation from frontend)
bot.on('web_app_data', (ctx) => {
  try {
    const data = JSON.parse(ctx.webAppData.data);
    if (data.type === 'booking_confirmed') {
      const { room_name, date, start_time, end_time } = data;
      ctx.reply(
        `✅ *Бронирование подтверждено!*\n\n` +
        `🏢 ${room_name}\n` +
        `📅 ${date}\n` +
        `🕐 ${start_time} – ${end_time}`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (e) {
    console.error('web_app_data parse error:', e);
  }
});

const http = require('http');
http.createServer((_, res) => res.end('ok')).listen(process.env.PORT || 3000);

bot.launch();
console.log('🤖 Alpina Booking Bot запущен');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
