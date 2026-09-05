const { Bot, InlineKeyboard, Keyboard } = require("grammy");
const http = require("http");

// ==========================================
// 1. ASOSIY SOZLAMALAR VA ADMIN MAXFIYLIGI
// ==========================================
const BOT_TOKEN = process.env.BOT_TOKEN || "8937720285:AAG-qKGEE8dCMsH2CNQwRlSrAtRCPwsN7DQ";

// Sizning shaxsiy Telegram ID va Username ma'lumotlaringiz
const MY_ADMIN_ID = 8977292662; 
const ADMIN_USERNAME = "@ADHAMAJON_AHMADOV";

const bot = new Bot(BOT_TOKEN);

// Xotira bazasi (In-memory Storage)
const moviesDatabase = new Map(); // Kino kodi -> File ID
const requiredChannels = new Set(); // Majburiy obuna kanallari
const usersList = new Set(); // Foydalanuvchilar ro'yxati
let totalSearches = 0;

// ==========================================
// 2. SERVER (RENDER 24/7 ONLINE TIZIMI)
// ==========================================
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Universal Premium KinoBot Engine Active 24/7");
}).listen(PORT, () => {
  console.log(`[SYSTEM] Server ${PORT}-portda muvaffaqiyatli ishga tushdi.`);
});

// ==========================================
// 3. MAJBURIY OBUNA TEKSHIRUV TIZIMI
// ==========================================
async function checkUserSub(ctx) {
  // Kanal yo'q bo'lsa yoki murojaat qilayotgan odam Admin bo'lsa cheklov bo'lmaydi
  if (requiredChannels.size === 0) return true;
  if (ctx.from.id === MY_ADMIN_ID) return true;

  for (const channel of requiredChannels) {
    try {
      const member = await ctx.api.getChatMember(channel, ctx.from.id);
      if (["left", "kicked"].includes(member.status)) {
        return false;
      }
    } catch (err) {
      console.error(`[SUB CHECK ERROR] Kanal (${channel}):`, err.message);
    }
  }
  return true;
}

// Global middleware
bot.use(async (ctx, next) => {
  if (ctx.from && !ctx.from.is_bot) {
    usersList.add(ctx.from.id);
  }

  // Shaxsiy muloqotda obunani tekshirish (/start dan tashqari)
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
// 4. MAIN USER COMMANDS (ODDIY FOYDALANUVCHILAR)
// ==========================================

// /start buyrug'i
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
    `Kino yuklab olish uchun shunchaki kino kodini yuboring (Masalan: \`250\` yoki \`500\`).`,
    { parse_mode: "Markdown", reply_markup: userKb }
  );
});

// Yo'riqnoma
bot.hears("🔍 Qanday foydalaniladi?", async (ctx) => {
  await ctx.reply(
    "📌 **Yo'riqnoma:**\n\n" +
    "1. Kanalimizdan o'zingizga ma'qul kino kodini toping.\n" +
    "2. Ushbu kodni botga yuboring (Masalan: `250`).\n" +
    "3. Bot kinoni bir soniyada sizga yetkazib beradi!",
    { parse_mode: "Markdown" }
  );
});

// Statistika (Jonli hisoblagich)
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

// Admin bilan aloqa
bot.hears("👨‍💻 Admin bilan aloqa", async (ctx) => {
  await ctx.reply(`💬 Savol va murojaatlar uchun admin: ${ADMIN_USERNAME}`);
});

// ==========================================
// 5. MAXFIY ADMIN PANEL (FAQAT SIZ UCHUN)
// ==========================================

// KANAL QO'SHISH: /addchannel @kanal_username
bot.command("addchannel", async (ctx) => {
  if (ctx.from.id !== MY_ADMIN_ID) return; // Boshqalarga bot javob bermaydi

  const chName = ctx.message.text.split(" ")[1];
  if (!chName || !chName.startsWith("@")) {
    return ctx.reply("⚠️ Noto'g'ri format! Masalan: `/addchannel @kanal_nomi`", { parse_mode: "Markdown" });
  }

  requiredChannels.add(chName);
  await ctx.reply(`✅ **${chName}** majburiy obuna ro'yxatiga qo'shildi!`, { parse_mode: "Markdown" });
});

// KANALLARNI TOZALASH: /delchannels
bot.command("delchannels", async (ctx) => {
  if (ctx.from.id !== MY_ADMIN_ID) return;
  requiredChannels.clear();
  await ctx.reply("🗑 Barcha majburiy kanallar ro'yxatdan olib tashlandi!");
});

// ULANGAN KANALLAR RO'YXATI: /listchannels
bot.command("listchannels", async (ctx) => {
  if (ctx.from.id !== MY_ADMIN_ID) return;
  if (requiredChannels.size === 0) return ctx.reply("📢 Hozircha majburiy kanallar yo'q.");

  const channelList = Array.from(requiredChannels).join("\n");
  await ctx.reply(`📢 **Ulangan kanallar:**\n\n${channelList}`, { parse_mode: "Markdown" });
});

// REKLAMA TARQATISH: /send [xabar matni]
bot.command("send", async (ctx) => {
  if (ctx.from.id !== MY_ADMIN_ID) return;

  const msg = ctx.message.text.replace("/send", "").trim();
  if (!msg) return ctx.reply("⚠️ Reklama matnini kiriting!");

  let successCount = 0;
  for (const uId of usersList) {
    try {
      await ctx.api.sendMessage(uId, msg);
      successCount++;
    } catch (e) {}
  }
  await ctx.reply(`✅ Reklama **${successCount}** ta foydalanuvchiga yuborildi.`);
});

// ==========================================
// 6. KINO QO'SHISH VA QIDIRISH TIZIMI
// ==========================================

// KINO QO'SHISH (Faqat Admin video yuborib izohiga "kino:250" deb yozsa saqlaydi)
bot.on("message:video", async (ctx) => {
  if (ctx.from.id !== MY_ADMIN_ID) return; // Oddiy foydalanuvchilar video yuklay olmaydi

  const caption = ctx.message.caption || "";
  const match = caption.toLowerCase().match(/kino\s*:\s*(\d+)/);

  if (match) {
    const code = match[1];
    const fileId = ctx.message.video.file_id;

    moviesDatabase.set(code, fileId);
    await ctx.reply(`✅ **Kino muvaffaqiyatli saqlandi!**\n🔑 KODI: \`${code}\``, { parse_mode: "Markdown" });
  } else {
    await ctx.reply("⚠️ Kinoni bazaga saqlash uchun video izohiga (caption) `kino:250` shaklida kodingizni yozing!", { parse_mode: "Markdown" });
  }
});

// KINO QIDIRISH (Oddiy foydalanuvchi kod yuborganda)
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();

  // Menyudagi tugmalar bo'lsa o'tkazib yuborish
  if (["🔍 Qanday foydalaniladi?", "📊 Statistika", "👨‍💻 Admin bilan aloqa"].includes(text)) return;

  // Faqat raqamli kodlarni qabul qilish
  if (!/^\d+$/.test(text)) {
    return ctx.reply("❌ **Noto'g'ri kod!** Iltimos, faqat kino kodini yuboring (Masalan: `250`).", { parse_mode: "Markdown" });
  }

  await ctx.replyWithChatAction("upload_video");

  // Bazadan izlash va uzatish
  if (moviesDatabase.has(text)) {
    const videoFileId = moviesDatabase.get(text);
    await ctx.replyWithVideo(videoFileId, {
      caption: `🎬 **Kino kodi: ${text}**\n\n🍿 Maroqli tomosha tilaymiz!`,
      parse_mode: "Markdown",
    });
    totalSearches++;
  } else {
    await ctx.reply("❌ **Afsuski, bu kod bo'yicha kino topilmadi.**", { parse_mode: "Markdown" });
  }
});

// Inline tugma bosilgandagi holat
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

// Anti-crash xatolik ushlagichi
bot.catch((err) => console.error("[CRASH PREVENTED]:", err.error));

// Botni ishga tushirish
bot.start();
console.log("🚀 Premium Kino Bot muvaffaqiyatli ishga tushdi!");
