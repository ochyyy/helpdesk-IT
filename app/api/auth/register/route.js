export const dynamic = "force-dynamic";
import TelegramBot from "node-telegram-bot-api";
import bcrypt from "bcrypt";
import { db } from "@/lib/db.js";

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const step = {}; // simpan state user

bot.onText(/\/daftar/, (msg) => {
  step[msg.chat.id] = { stage: "username" };
  bot.sendMessage(msg.chat.id, "📝 Masukkan username:");
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  if (!step[chatId] || msg.text.startsWith("/")) return;

  // STEP USERNAME
  if (step[chatId].stage === "username") {
    step[chatId].username = msg.text;
    step[chatId].stage = "password";
    return bot.sendMessage(chatId, "🔒 Masukkan password:");
  }

  // STEP PASSWORD
  if (step[chatId].stage === "password") {
    const { username } = step[chatId];
    const passwordHash = await bcrypt.hash(msg.text, 10);

    try {
      await db.query(
        `INSERT INTO users (username, password, role, telegram_chat_id)
         VALUES (?, ?, 'user', ?)`,
        [username, passwordHash, chatId]
      );

      bot.sendMessage(
        chatId,
        "✅ Registrasi berhasil!\nSekarang kamu bisa login di web."
      );
    } catch (err) {
      bot.sendMessage(chatId, "❌ Username sudah digunakan.");
    }

    delete step[chatId];
  }
});
