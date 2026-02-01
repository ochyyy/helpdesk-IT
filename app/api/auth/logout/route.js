export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET() {
  try {
    const token = cookies().get("token")?.value;
    if (!token) {
      return new Response(
        JSON.stringify({ message: "Unauthorized" }),
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.query(
      "SELECT * FROM laporan WHERE user_id = ? ORDER BY created_at DESC",
      [decoded.id]
    );

    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("GET USER LAPORAN ERROR:", err);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500 }
    );
  }
}

export async function POST() {
  const res = NextResponse.json({ message: "OK" });
  res.cookies.set("token", "", {
    path: "/",
    expires: new Date(0),
  });
  return res;
}
