export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import bcrypt from "bcrypt";
import { db } from "@/lib/db";

export async function POST(req) {
  try {
    const { username, password, telegram_chat_id } = await req.json();

    if (!username || !password || !telegram_chat_id) {
      return Response.json(
        { success: false, message: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.query(
      `
      INSERT INTO users (username, password, role, telegram_chat_id)
      VALUES ($1, $2, 'user', $3)
      `,
      [username, passwordHash, telegram_chat_id]
    );

    // 🔥 KIRIM TELEGRAM TANPA POLLING (AMAN)
    await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegram_chat_id,
          text: "✅ Registrasi berhasil!\nSekarang kamu bisa login di web.",
        }),
      }
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return Response.json(
      { success: false, message: "Username sudah digunakan" },
      { status: 500 }
    );
  }
}
