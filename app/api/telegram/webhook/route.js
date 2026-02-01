export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const message = body.message;

    if (!message || !message.text) {
      return Response.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    // ======================
    // /start → link telegram
    // ======================
    if (text === "/start") {
      await db.query(
        `UPDATE users
         SET telegram_chat_id = $1
         WHERE telegram_id = $2`,
        [chatId, message.from.username]
      );

      await sendMessage(
        chatId,
        "✅ Akun kamu berhasil terhubung dengan sistem Helpdesk IT."
      );

      return Response.json({ ok: true });
    }

    // ======================
    // /reset TOKEN PASSWORD
    // ======================
    if (text.startsWith("/reset")) {
      const [, token, newPass] = text.split(" ");

      if (!token || !newPass) {
        await sendMessage(
          chatId,
          "❌ Format salah.\nGunakan:\n/reset TOKEN PASSWORD_BARU"
        );
        return Response.json({ ok: true });
      }

      const result = await db.query(
        `SELECT id FROM users
         WHERE reset_token = $1
         AND reset_expired > NOW()`,
        [token]
      );

      if (result.rows.length === 0) {
        await sendMessage(
          chatId,
          "❌ Token tidak valid atau sudah kadaluarsa."
        );
        return Response.json({ ok: true });
      }

      const hashed = await bcrypt.hash(newPass, 10);

      await db.query(
        `UPDATE users
         SET password = $1,
             reset_token = NULL,
             reset_expired = NULL
         WHERE id = $2`,
        [hashed, result.rows[0].id]
      );

      await sendMessage(chatId, "✅ Password berhasil diubah.");

      return Response.json({ ok: true });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("TELEGRAM WEBHOOK ERROR:", err);
    return Response.json({ ok: true });
  }
}
