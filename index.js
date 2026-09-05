const { Bot, InlineKeyboard, Keyboard } = require("grammy");
const http = require("http");

// ------------------------------------------------------------------
// 1. SOZLAMALAR (TOKEN VA MA'LUMOTLAR)
// ------------------------------------------------------------------
// Token va Kanal ID'sini Render Environment'dan oladi, bo'lmasa pastdagini ishlatadi
const BOT_TOKEN = process.env.BOT_TOKEN || "8937720285:AAG-qKGEE8dCMsH2CNQwRlSrAtRCPwsN7DQ";
const CHANNEL_ID = process.env.CHANNEL_ID || "-100XXXXXXXXXX"; // Bu yerga kanal ID'ingizni yozing (-100 bilan)
const ADMIN_USERNAME = "@adhamjon"; // Sizning Telegram user name'ingiz

const bot = new Bot(BOT_TOKEN);

// Ma'lumotlarni vaqtinchalik saqlash
const users = new Set();
const movieStats = { totalSearches: 0 };

// ------------------------------------------------------------------
// 2. SERVER (RENDER UXLAP QOLMASLIGI UCHUN PORT BINDING)
// ------------------------------------------------------------------
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Kinokod Bot Active!");
}).listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishlamoqda.`);
});

// ------------------------------------------------------------------
// 3. MIDDLEWARE (FOYDALANUVCHILARNI RO'YXATGA OLISH)
// ------------------------------------------------------------------
bot.use(async (ctx, next) => {
  if (ctx.from && !ctx.from.is_bot) {
    users.add(ctx.from.id);
  }
  await next();
});

// ------------------------------------------------------------------
// 4. BUYRUQLAR VA MENYU
// ------------------------------------------------------------------

// /start buyrug'i
bot.command("start", async (ctx) => {
  const welcomeText = 
    `🎬 **Universal Kino Botiga xush kelibsiz!**\n\n` +
    `Siz bu bot orqali istalgan kinoni yuqori sifatda va tezkorlik bilan yuklab olishingiz mumkin.\n\n` +
    `🔍 **Kino olish uchun:**\n` +
    `Kino kodini yuboring (Masalan: \`15\`)`;

  const mainKeyboard = new Keyboard()
    .text("🔍 Qanday foydalaniladi?").text("📊 Statistika").row()
    .text("👨‍💻 Admin bilan aloqa").resized();

  await ctx.reply(welcomeText, {
    parse_mode: "Markdown",
    reply_markup: mainKeyboard,
  });
});

// Qanday foydalaniladi
bot.hears("🔍 Qanday foydalaniladi?", async (ctx) => {
  await ctx.reply(
    "📌 **Yo'riqnoma:**\n\n" +
    "1. Kanalimizdan o'zingizga yoqqan kinoning kodini toping.\n" +
    "2. Ushbu kodni botga yuboring.\n" +
    "3. Bot sizga kinoni lahzalarda uzatib beradi!",
    { parse_mode: "Markdown" }
  );
});

// Statistika
bot.hears("📊 Statistika", async (ctx) => {
  const statMessage = 
    `📊 **Bot Statistikasi:**\n\n` +
    `👥 Jami foydalanuvchilar: **${users.size}** ta\n` +
    `🎬 Qidirilgan kinolar: **${movieStats.totalSearches}** marta\n` +
    `⚡️ Server holati: **A'lo (24/7 online)**`;

  await ctx.reply(statMessage, { parse_mode: "Markdown" });
});

// Admin bilan aloqa
bot.hears("👨‍💻 Admin bilan aloqa", async (ctx) => {
  await ctx.reply(`💬 Savol va murojaatlar uchun admin: ${ADMIN_USERNAME}`);
});

// ------------------------------------------------------------------
// 5. ASOSIY KINO QIDIRISH VA TEZKOR UZATISH (FORWARD)
// ------------------------------------------------------------------
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();

  // Tugma xabarlarini o'tkazib yuboramiz
  if (["🔍 Qanday foydalaniladi?", "📊 Statistika", "👨‍💻 Admin bilan aloqa"].includes(text)) {
    return;
  }

  // Kod faqat raqam ekanligini tekshiramiz
  const msgId = parseInt(text);

  if (isNaN(msgId)) {
    return ctx.reply(
      "❌ **Noto'g'ri format!**\nIltimos, faqat kino kodini (raqam) yuboring.",
      { parse_mode: "Markdown" }
    );
  }

  try {
    // Yuklanmoqda statusini ko'rsatish
    await ctx.replyWithChatAction("upload_video");

    // Katta hajmdagi kinolarni ham bir soniyada uzatish
    await ctx.api.forwardMessage(ctx.chat.id, CHANNEL_ID, msgId);

    // Statistikaga qo'shish
    movieStats.totalSearches++;

  } catch (error) {
    console.error(`Kino uzatishda xatolik (ID: ${msgId}):`, error.message);

    await ctx.reply(
      "❌ **Afsuski, bu kod bo'yicha kino topilmadi.**\n\n" +
      "Kodni to'g'ri kiritganingizni yoki kanalimizda ushbu kino mavjudligini tekshirib ko'ring.",
      { parse_mode: "Markdown" }
    );
  }
});

// ------------------------------------------------------------------
// 6. XATOLIKLARNI USHLASH
// ------------------------------------------------------------------
bot.catch((err) => {
  console.error("Botda xatolik:", err.error);
});

// Botni ishga tushirish
bot.start();
console.log("🚀 Premium Kino Bot muvaffaqiyatli ishga tushdi!");
