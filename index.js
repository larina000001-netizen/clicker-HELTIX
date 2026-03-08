const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');

// 1. ПОДКЛЮЧЕНИЕ К БАЗЕ FIREBASE
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://lolololowka14-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = admin.database();

// 2. НАСТРОЙКИ БОТА
const token = '8730082084:AAGpaFhF2635_C4sE3_ApauC2j1Ceku4msU';
const ADMIN_ID = 7026785868;
const bot = new TelegramBot(token, {polling: true});

console.log("Бот успешно запущен, следит за донатами и пересылает чеки!");

// 3. СЕКРЕТНАЯ КОМАНДА ДЛЯ ТЕБЯ: /givevip никнейм
bot.onText(/\/givevip (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  
  if (chatId !== ADMIN_ID) {
    return bot.sendMessage(chatId, "⛔ У вас нет прав для этой команды.");
  }

  const playerName = match[1].toLowerCase().trim();

  try {
    const ref = db.ref(`accounts/${playerName}`);
    const snapshot = await ref.once('value');

    if (!snapshot.exists()) {
      return bot.sendMessage(chatId, `❌ Игрок "${playerName}" не найден в базе. Пусть сначала зайдет в игру!`);
    }

    // ВЫДАЕМ VIP!
    await db.ref(`accounts/${playerName}/isVip`).set(true);
    bot.sendMessage(chatId, `✅ Игроку "${playerName}" успешно выдан VIP-статус!`);

  } catch (error) {
    bot.sendMessage(chatId, `Ошибка: ${error.message}`);
  }
});

// 4. КОМАНДА /start (ПРИВЕТСТВИЕ ДЛЯ ИГРОКОВ)
bot.onText(/\/start/, (msg) => {
  const text = `
Привет, ${msg.from.first_name}! 👑
Хочешь эксклюзивный "Огненный VIP Скин" на кнопку и золотой ник в профиле и x2 + авто кликер?

💎 Стоимость: 30 руб.
Как получить:
1. Перейди по ссылке и оплати через DonationAlerts:
👉 https://www.donationalerts.com/r/Timyr1543
(Обязательно напиши свой точный НИК из игры в сообщении к донату!)

2. После оплаты отправь скриншот чека прямо сюда, в этот чат.
3. Админ проверит чек и выдаст тебе VIP!
  `;
  bot.sendMessage(msg.chat.id, text);
});

// 5. СИСТЕМА СЛЕЖЕНИЯ (ПЕРЕСЫЛКА СКРИНШОТОВ ТЕБЕ)
bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  // Если это команда (начинается с /), ничего не делаем
  if (msg.text && msg.text.toString().startsWith('/')) return;

  // Если пишет обычный игрок (не ты) — бот пересылает сообщение ТЕБЕ
  if (chatId !== ADMIN_ID) {
    // Пересылаем сам чек/сообщение
    bot.forwardMessage(ADMIN_ID, chatId, msg.message_id);
    // Пишем тебе подсказку, от кого это пришло
    bot.sendMessage(ADMIN_ID, `👆 Пришел новый скриншот/сообщение от: ${msg.from.first_name} (@${msg.from.username || 'Скрыт'})\nПроверь донат и если всё ок, пиши: /givevip ник_игрока`);
  }
});