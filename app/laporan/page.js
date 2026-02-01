"use client";

export const dynamic = "force-dynamic";

export default function LaporanPage() {
  // ⛔ BUILD GUARD — WAJIB
  if (typeof window === "undefined") {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-800 text-white">
      <h1 className="text-xl font-bold">
        Halaman laporan hanya tersedia saat runtime
      </h1>
    </div>
  );
}
