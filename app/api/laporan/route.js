export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
  try {
    // ⬇️ TERIMA JSON, BUKAN FormData
    const {
      judul,
      deskripsi,
      kategori,
      lokasi,
      prioritas,
      gambar,
      user_id,
    } = await req.json();

    await db.query(
      `
      INSERT INTO laporan
      (judul, deskripsi, kategori, lokasi, prioritas, status, gambar, user_id)
      VALUES ($1,$2,$3,$4,$5,'Baru',$6,$7)
      `,
      [judul, deskripsi, kategori, lokasi, prioritas, gambar, user_id]
    );

    return NextResponse.json({
      success: true,
      message: "Laporan berhasil dikirim",
    });
  } catch (err) {
    console.error("ERROR LAPORAN USER:", err);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengirim laporan",
      },
      { status: 500 }
    );
  }
}
