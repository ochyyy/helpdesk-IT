export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import bcrypt from "bcryptjs";


export async function POST(req) {
  try {
    const { username, password } = await req.json();

    const result = await db.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return Response.json({ message: "User tidak ditemukan" }, { status: 401 });
    }

    const user = result.rows[0];

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return Response.json({ message: "Password salah" }, { status: 401 });
    }

    return Response.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return Response.json({ message: "Terjadi kesalahan" }, { status: 500 });
  }
}
