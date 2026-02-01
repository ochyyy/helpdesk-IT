import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    const result = await db.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return Response.json(
        { message: "User tidak ditemukan" },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return Response.json(
        { message: "Password salah" },
        { status: 401 }
      );
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
    return Response.json({ message: "Server error" }, { status: 500 });
  }
}
