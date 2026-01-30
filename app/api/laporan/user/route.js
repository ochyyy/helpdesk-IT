export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return new Response(
        JSON.stringify({ message: "Unauthorized" }),
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.query(
      `SELECT * FROM laporan WHERE user_id = ? ORDER BY created_at DESC`,
      [decoded.id]
    );

    return new Response(
      JSON.stringify(rows),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    console.error("LAPORAN USER ERROR:", err);

    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500 }
    );
  }
}
