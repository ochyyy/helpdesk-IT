import dotenv from "dotenv";
dotenv.config();

import TelegramBot from "node-telegram-bot-api";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

// ================= CEK TOKEN =================
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN tidak terbaca");
  process.exit(1);
}

// ================= BOT =================
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: true,
});

console.log("🤖 Bot Telegram aktif");

// ================= DATABASE =================
const db = await mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false },
});

// ================= SESSION =================
const sessions = {};

// ================= SAFE SEND (ANTI MARKDOWN ERROR) =================
const send = (chatId, text) =>
  bot.sendMessage(chatId, text, { parse_mode: "HTML" });

// ================= /start =================
bot.onText(/^\/start$/, async (msg) => {
  await send(
    msg.chat.id,
    `
👋 <b>Helpdesk IT Bot</b>

Perintah:
<b>daftar</b> → buat akun
<b>batal</b> → batalkan proses
<code>/reset KODE PASSWORD_BARU</code>

Contoh:
<code>/reset 255448 passwordbaru</code>
`
  );
});

// ================= RESET PASSWORD =================
bot.onText(/^\/reset (\d{6}) (.+)$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const token = match[1];
  const newPassword = match[2];

  if (newPassword.length < 4) {
    return send(chatId, "❌ Password minimal 4 karakter");
  }

  try {
    const [rows] = await db.query(
      `SELECT id FROM users
       WHERE reset_token = ?
       AND telegram_chat_id = ?
       AND reset_expired > NOW()
       LIMIT 1`,
      [token, chatId]
    );

    if (!rows.length) {
      return send(chatId, "❌ Token tidak valid / kadaluarsa");
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await db.query(
      `UPDATE users
       SET password=?, reset_token=NULL, reset_expired=NULL
       WHERE id=?`,
      [hash, rows[0].id]
    );

    return send(
      chatId,
      "✅ Password berhasil direset.\nSilakan login dengan password baru."
    );
  } catch (err) {
    console.error(err);
    return send(chatId, "❌ Server error");
  }
});

// ================= DAFTAR (FLOW AMAN) =================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  // abaikan command
  if (text.startsWith("/")) return;

  if (text.toLowerCase() === "batal") {
    delete sessions[chatId];
    return send(chatId, "❌ Proses dibatalkan");
  }

  if (text.toLowerCase() === "daftar") {
    sessions[chatId] = { step: "username" };
    return send(chatId, "Masukkan <b>username</b>:");
  }

  const session = sessions[chatId];
  if (!session) return;

  // STEP USERNAME
  if (session.step === "username") {
    const [rows] = await db.query(
      "SELECT id FROM users WHERE username=?",
      [text]
    );

    if (rows.length) {
      return send(chatId, "❌ Username sudah digunakan");
    }

    session.username = text;
    session.step = "password";
    return send(chatId, "Masukkan <b>password</b>:");
  }

  // STEP PASSWORD
  if (session.step === "password") {
    if (text.length < 4) {
      return send(chatId, "❌ Password minimal 4 karakter");
    }

    const hash = await bcrypt.hash(text, 10);

    await db.query(
      `INSERT INTO users
       (username, password, role, telegram_id, telegram_chat_id)
       VALUES (?, ?, 'user', ?, ?)`,
      [session.username, hash, msg.from.id, chatId]
    );

    delete sessions[chatId];
    return send(
      chatId,
      "✅ Akun berhasil dibuat.\nSilakan login di web Helpdesk IT."
    );
  }
});
