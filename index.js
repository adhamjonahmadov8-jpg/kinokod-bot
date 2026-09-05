const { Bot, InlineKeyboard, Keyboard } = require("grammy");
const http = require("http");

// ==========================================
// 1. ASOSIY SOZLAMALAR
// ==========================================
const BOT_TOKEN = process.env.BOT_TOKEN || "8937720285:AAG-qKGEE8dCMsH2CNQwRlSrAtRCPwsN7DQ";
const MY_ADMIN_ID = 8977292662; 
const ADMIN_USERNAME = "@ADHAMAJON_AHMADOV";

const bot = new Bot(BOT_TOKEN);

// Xotira bazasi
const moviesDatabase = new Map(); // Kino kodi -> Video Message/File ID
const requiredChannels = new Set();
const usersList = new Set();
let totalSearches = 0;

// ==========================================
// 2. SERVER (RENDER 24/7 ONLINE)
// ==========================================
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Universal KinoBot Active 24/7");
}).listen(PORT, () => {
  console.log(`[SYSTEM] Server ${PORT}-portda ishlamoqda.`);
});

// ==========================================
// 3. MAJBURIY OBUNA TEKSHIRUVI
// ==========================================
async function checkUserSub(ctx) {
  if (requiredChannels.size === 0) return true;
  if (ctx.from.id === MY_ADMIN_ID) return true;

  for (const channel of requiredChannels) {
    try {
      const member = await ctx.api.getChatMember(channel, ctx.from.id);
      if (["left", "kicked"].includes(member.status)) {
        return false;
      }
    } catch (err) {
      console.error(`[SUB ERROR] ${channel}:`, err.message);
    }
  }
  return true;
}

bot.use(async (ctx, next) => {
  if (ctx.from && !ctx.from.is_bot) {
    usersList.add(ctx.from.id);
  }

  if (ctx.chat?.type === "private" && ctx.message?.text !== "/start") {
    const isOk = await checkUserSub(ctx);
    if (!isOk) {
      const kb = new InlineKeyboard();
      for (const ch of requiredChannels) {
        kb.url(`📢 Kanalga obuna bo'lish`, `https://t.me/${ch.replace("@", "")}`).row();
      }
      kb.text("✅ Obunani tekshirish", "check_subscription_btn");

      return ctx.reply("⚠️ **Botdan foydalanish uchun quyidagi kanallarga obuna bo'ling:**", {
        parse_mode: "Markdown",
        reply_markup: kb,
      });
    }
  }

  await next();
});

// ==========================================
// 4. KANALDA YANGI KINO CHIQGANDA AVTO-SAQLASH TIZIMI
// ==========================================
bot.on("channel_post", async (ctx) => {
  const post = ctx.channelPost;
  
  // Agar postda video va izoh (caption) bo'lsa
  if (post.video && post.caption) {
    // Izohdan raqamni topish (Masalan: "Kod: 257" -> 257)
    const match = post.caption.match(/\d+/);
    if (match) {
      const code = match[0];
      moviesDatabase.set(code, post.video.file_id);
      console.log(`[AUTO-SAVE] Kanal postidan kino saqlandi! KOD: ${code}`);
    }
  }
});

// ==========================================
// 5. ASOSIY BUYRUQLAR (USER MENU)
// ==========================================
bot.command("start", async (ctx) => {
  const isOk = await checkUserSub(ctx);
  if (!isOk) {
    const kb = new InlineKeyboard();
    for (const ch of requiredChannels) {
      kb.url(`📢 Kanalga obuna bo'lish`, `https://t.me/${ch.replace("@", "")}`).row();
    }
    kb.text("✅ Obunani tekshirish", "check_subscription_btn");

    return ctx.reply("⚠️ **Botdan foydalanish uchun quyidagi kanallarga obuna bo'ling:**", {
      parse_mode: "Markdown",
      reply_markup: kb,
    });
  }

  const userKb = new Keyboard()
    .text("🔍 Qanday foydalaniladi?").text("📊 Statistika").row()
    .text("👨‍💻 Admin bilan aloqa").resized();

  await ctx.reply(
    `🎬 **Xush kelibsiz, ${ctx.from.first_name}!**\n\n` +
    `Kino yuklab olish uchun shunchaki kino kodini yuboring (Masalan: \`200\` yoki \`257\`).`,
    { parse_mode: "Markdown", reply_markup: userKb }
  );
});

bot.hears("🔍 Qanday foydalaniladi?", async (ctx) => {
  await ctx.reply(
    "📌 **Yo'riqnoma:**\n\n" +
    "1. Kanalimizdan kino kodini ko'ring (Masalan: `Kod: 257`).\n" +
    "2. Botga faqat raqamni yuboring (Masalan: `257`).\n" +
    "3. Bot kinoni sizga yetkazib beradi!",
    { parse_mode: "Markdown" }
  );
});

bot.hears("📊 Statistika", async (ctx) => {
  await ctx.reply(
    `📊 **Bot Statistikasi:**\n\n` +
    `👥 Foydalanuvchilar: **${usersList.size}** ta\n` +
    `🎬 Baza ichidagi kinolar: **${moviesDatabase.size}** ta\n` +
    `🔎 Jami qidiruvlar: **${totalSearches}** marta\n` +
    `⚡️ Server holati: **Online (24/7)**`,
    { parse_mode: "Markdown" }
  );
});

bot.hears("👨‍💻 Admin bilan aloqa", async (ctx) => {
  await ctx.reply(`💬 Savol va murojaatlar uchun admin: ${ADMIN_USERNAME}`);
});

// ==========================================
// 6. MAXFIY ADMIN BUYRUQLARI
// ==========================================
bot.command("addchannel", async (ctx) => {
  if (ctx.from.id !== MY_ADMIN_ID) return;
  const chName = ctx.message.text.split(" ")[1];
  if (!chName || !chName.startsWith("@")) {
    return ctx.reply("⚠️ Masalan: `/addchannel @kanal_nomi`", { parse_mode: "Markdown" });
  }
  requiredChannels.add(chName);
  await ctx.reply(`✅ **${chName}** obuna ro'yxatiga qo'shildi!`, { parse_mode: "Markdown" });
});

bot.command("delchannels", async (ctx) => {
  if (ctx.from.id !== MY_ADMIN_ID) return;
  requiredChannels.clear();
  await ctx.reply("🗑 Barcha majburiy kanallar olib tashlandi!");
});

bot.command("send", async (ctx) => {
  if (ctx.from.id !== MY_ADMIN_ID) return;
  const msg = ctx.message.text.replace("/send", "").trim();
  if (!msg) return ctx.reply("⚠️ Matn kiriting!");

  let count = 0;
  for (const uId of usersList) {
    try {
      await ctx.api.sendMessage(uId, msg);
      count++;
    } catch (e) {}
  }
  await ctx.reply(`✅ Reklama **${count}** ta foydalanuvchiga yuborildi.`);
});

// ==========================================
// 7. KINO YUKLASH VA QIDIRISH MANTIQLARI
// ==========================================

// Botingiz shaxsiyiga admin video yuborib izohiga "257" yoki "kino:257" deb yozganda saqlash
bot.on("message:video", async (ctx) => {
  if (ctx.from.id !== MY_ADMIN_ID) return;

  const caption = ctx.message.caption || "";
  const match = caption.match(/\d+/);

  if (match) {
    const code = match[0];
    const fileId = ctx.message.video.file_id;
    moviesDatabase.set(code, fileId);
    await ctx.reply(`✅ **Kino saqlandi!**\n🔑 KODI: \`${code}\``, { parse_mode: "Markdown" });
  } else {
    await ctx.reply("⚠️ Izohda raqamli kod topilmadi!", { parse_mode: "Markdown" });
  }
});

// Foydalanuvchi kod yuborganda kinoni uzatish
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();

  if (["🔍 Qanday foydalaniladi?", "📊 Statistika", "👨‍💻 Admin bilan aloqa"].includes(text)) return;

  // Izohdan faqat raqamni ajratib olish (Masalan: "kod: 257" kelsa ham 257 deb oladi)
  const match = text.match(/\d+/);

  if (!match) {
    return ctx.reply("❌ **Noto'g'ri kod!** Iltimos, faqat kino kodini yuboring (Masalan: `257`).", { parse_mode: "Markdown" });
  }

  const code = match[0];

  await ctx.replyWithChatAction("upload_video");

  if (moviesDatabase.has(code)) {
    const videoFileId = moviesDatabase.get(code);
    await ctx.replyWithVideo(videoFileId, {
      caption: `🎬 **Kino kodi: ${code}**\n\n🍿 Maroqli tomosha tilaymiz!`,
      parse_mode: "Markdown",
    });
    totalSearches++;
  } else {
    await ctx.reply("❌ **Afsuski, bu kod bo'yicha kino topilmadi.**\n\nKino hali bot bazasiga kiritilmagan.", { parse_mode: "Markdown" });
  }
});

bot.on("callback_query:data", async (ctx) => {
  if (ctx.callbackQuery.data === "check_subscription_btn") {
    const isOk = await checkUserSub(ctx);
    if (isOk) {
      await ctx.answerCallbackQuery({ text: "✅ Obuna tasdiqlandi!" });
      await ctx.deleteMessage();
      await ctx.reply("🎉 Obuna tasdiqlandi! Endi kino kodini yuborishingiz mumkin.");
    } else {
      await ctx.answerCallbackQuery({ text: "❌ Barcha kanallarga obuna bo'lmadingiz!", show_alert: true });
    }
  }
});

bot.catch((err) => console.error("[CRASH PREVENTED]:", err.error));

bot.start();
console.log("🚀 Premium Kino Bot muvaffaqiyatli ishga tushdi!");
