const { Bot, InlineKeyboard, Keyboard } = require("grammy");
const http = require("http");

// ==========================================
// 1. ASOSIY SOZLAMALAR
// ==========================================
const BOT_TOKEN = process.env.BOT_TOKEN || "8937720285:AAG-qKGEE8dCMsH2CNQwRlSrAtRCPwsN7DQ";
const MY_ADMIN_ID = 8977292662; 
const ADMIN_USERNAME = "@ADHAMAJON_AHMADOV";

const bot = new Bot(BOT_TOKEN);

// Vaqtinchalik saqlagichlar
const requiredChannels = new Set();
const usersList = new Set();

// ==========================================
// 2. SERVER VA UXLAMASLIK TIZIMI (24/7)
// ==========================================
const PORT = process.env.PORT || 10000;
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("KinoBot Server Online 24/7");
}).listen(PORT, () => {
  console.log(`[SYSTEM] Server ${PORT}-portda ishlamoqda.`);
  
  if (RENDER_URL) {
    setInterval(() => {
      http.get(RENDER_URL, () => {
        console.log("[KEEP-ALIVE] Ping yuborildi.");
      }).on("error", () => {});
    }, 4 * 60 * 1000); // Har 4 daqiqada uyg'otib turadi
  }
});

// ==========================================
// 3. MAJBURIY OBUNA TEKSHIRUVI
// ==========================================
async function checkUserSub(ctx) {
  if (requiredChannels.size === 0 || ctx.from.id === MY_ADMIN_ID) return true;

  for (const channel of requiredChannels) {
    try {
      const member = await ctx.api.getChatMember(channel, ctx.from.id);
      if (["left", "kicked"].includes(member.status)) return false;
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
// 4. USER MENYU BUYRUQLARI
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
    `Kino yuklab olish uchun kino kodi (Message ID)ni yuboring (Masalan: \`21\` yoki \`257\`).`,
    { parse_mode: "Markdown", reply_markup: userKb }
  );
});

bot.hears("🔍 Qanday foydalaniladi?", async (ctx) => {
  await ctx.reply(
    "📌 **Yo'riqnoma:**\n\n" +
    "1. Kanalimizdagi kino kodini ko'ring.\n" +
    "2. Botga faqat raqamni yuboring (Masalan: `257`).\n" +
    "3. Bot kinoni bir zumda uzatib beradi!",
    { parse_mode: "Markdown" }
  );
});

bot.hears("📊 Statistika", async (ctx) => {
  await ctx.reply(
    `📊 **Bot Statistikasi:**\n\n` +
    `👥 Foydalanuvchilar: **${usersList.size}** ta\n` +
    `⚡️ Server holati: **Online (24/7 Active)**`,
    { parse_mode: "Markdown" }
  );
});

bot.hears("👨‍💻 Admin bilan aloqa", async (ctx) => {
  await ctx.reply(`💬 Savol va murojaatlar uchun admin: ${ADMIN_USERNAME}`);
});

// ==========================================
// 5. ADMIN PANEL BUYRUQLARI
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
// 6. KINO QIDIRISH VA TEZKOR UZATISH
// ==========================================
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();

  if (["🔍 Qanday foydalaniladi?", "📊 Statistika", "👨‍💻 Admin bilan aloqa"].includes(text)) return;

  const match = text.match(/\d+/);
  if (!match) {
    return ctx.reply("❌ **Noto'g'ri kod!** Iltimos, faqat kino kodi (raqam) yuboring.", { parse_mode: "Markdown" });
  }

  const msgId = parseInt(match[0]);
  const CHANNEL_ID = process.env.CHANNEL_ID; // Render Environment'dagi Kanal ID'si

  if (!CHANNEL_ID) {
    return ctx.reply("⚠️ Serverda `CHANNEL_ID` sozlanmagan!", { parse_mode: "Markdown" });
  }

  await ctx.replyWithChatAction("upload_video");

  try {
    // Kanaldan to'g'ridan-to'g'ri xabarni foydalanuvchiga uzatish
    await ctx.api.forwardMessage(ctx.chat.id, CHANNEL_ID, msgId);
  } catch (error) {
    await ctx.reply("❌ **Afsuski, bu kod bo'yicha kino topilmadi.**\n\nKino kanaldan o'chirilgan bo'lishi yoki kod noto'g'ri kiritilgan bo'lishi mumkin.", { parse_mode: "Markdown" });
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

bot.catch((err) => console.error("[BOT CRASH PREVENTED]:", err.error));

bot.start();
console.log("🚀 Premium Kino Bot muvaffaqiyatli ishga tushdi!");
