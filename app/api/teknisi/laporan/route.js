export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";

export async function GET() {
  try {
    const { rows } = await db.query(`
      SELECT
        l.*,
        u.username
      FROM laporan l
      JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
    `);

    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("TEKNISI LAPORAN ERROR:", err);

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
