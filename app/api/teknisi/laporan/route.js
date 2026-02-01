export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";

export async function GET() {
  try {
    const result = await db.query(`
      SELECT *
      FROM laporan
      ORDER BY created_at DESC
    `);

    return Response.json(result.rows);
  } catch (err) {
    console.error("TEKNISI ERROR:", err);
    return Response.json([], { status: 500 });
  }
}
