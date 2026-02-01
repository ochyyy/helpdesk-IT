export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";

export async function POST(req) {
  try {
    const {
      judul,
      deskripsi,
      kategori,
      lokasi,
      prioritas,
      gambar,
    } = await req.json();

    await db.query(
      `
      INSERT INTO laporan
      (judul, deskripsi, kategori, lokasi, prioritas, status, gambar)
      VALUES ($1,$2,$3,$4,$5,'Baru',$6)
      `,
      [judul, deskripsi, kategori, lokasi, prioritas, gambar]
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error("ERROR LAPORAN:", err);
    return Response.json(
      { message: "Gagal mengirim laporan" },
      { status: 500 }
    );
  }
}
