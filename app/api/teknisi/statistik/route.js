export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatMonthStart(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

function getISOWeekLabel(date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Thursday in current week decides the year.
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d, n) {
  const x = new Date(d);
  const m = x.getMonth() + n;
  x.setMonth(m);
  return x;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "harian";
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    // Determine default ranges when not provided for nicer charts
    const today = new Date();
    let startDate, endDate;

    if (startParam && endParam) {
      startDate = new Date(startParam);
      endDate = new Date(endParam);
    } else {
      endDate = new Date(formatDate(today)); // midnight today
      // Default: start from 2026-01-01 as requested
      const jan2026 = new Date(2026, 0, 1);
      if (mode === "harian") {
        startDate = jan2026;
      } else if (mode === "mingguan") {
        startDate = jan2026;
      } else {
        // bulanan - show from Jan 2026 as well
        startDate = jan2026;
      }
    }

    // Normalize start/end strings for SQL
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    let sql = "";
    let params = [startStr, endStr];

    // ================= HARIAN =================
    if (mode === "harian") {
      // return label as string YYYY-MM-DD to avoid timezone shifts when driver maps DATE -> JS Date
      sql = `
        SELECT
          DATE_FORMAT(created_at, '%Y-%m-%d') AS label,
          COUNT(*) AS total
        FROM laporan
        WHERE DATE(created_at) BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
        ORDER BY DATE_FORMAT(created_at, '%Y-%m-%d')
      `;
    }

    // ================= MINGGUAN =================
    if (mode === "mingguan") {
      sql = `
        SELECT
          CONCAT(YEAR(d), '-W', LPAD(WEEK(d, 1), 2, '0')) AS label,
          COUNT(*) AS total
        FROM (
          SELECT DATE(created_at) AS d
          FROM laporan
          WHERE DATE(created_at) BETWEEN ? AND ?
        ) x
        GROUP BY CONCAT(YEAR(d), '-W', LPAD(WEEK(d, 1), 2, '0'))
        ORDER BY MIN(d)
      `;
    }

    // ================= BULANAN =================
    if (mode === "bulanan") {
      sql = `
        SELECT
          DATE_FORMAT(d, '%Y-%m-01') AS label,
          COUNT(*) AS total
        FROM (
          SELECT DATE(created_at) AS d
          FROM laporan
          WHERE DATE(created_at) BETWEEN ? AND ?
        ) x
        GROUP BY DATE_FORMAT(d, '%Y-%m-01')
        ORDER BY MIN(d)
      `;
    }

    const [rows] = await db.query(sql, params);
    console.debug('STATISTIK QUERY', { mode, start: startStr, end: endStr, sql: sql.replace(/\s+/g, ' ').trim(), rowsSample: rows.slice(0,10) });

    // Build full series and fill missing periods with zero
    const map = new Map();
    rows.forEach((r) => {
      let key = r.label;
      // If DB returned a Date object or ISO timestamp, normalize to YYYY-MM-DD
      if (key instanceof Date) {
        key = formatDate(key);
      } else if (typeof key === "string" && /^\d{4}-\d{2}-\d{2}T/.test(key)) {
        key = formatDate(new Date(key));
      } else {
        key = String(key);
      }
      map.set(key, Number(r.total));
    });
    console.debug('STATISTIK MAP SAMPLE', Array.from(map.entries()).slice(0,10));

    const series = [];

    if (mode === "harian") {
      let cur = new Date(startDate);
      while (cur <= endDate) {
        const label = formatDate(cur);
        series.push({ label, total: map.get(label) || 0 });
        cur = addDays(cur, 1);
      }
    } else if (mode === "mingguan") {
      // align to Monday of the start week
      const s = new Date(startDate);
      const day = s.getDay() || 7; // Sunday -> 7
      const monday = addDays(s, 1 - day);
      let cur = new Date(monday);
      while (cur <= endDate) {
        const label = getISOWeekLabel(cur);
        series.push({ label, total: map.get(label) || 0 });
        cur = addDays(cur, 7);
      }
    } else {
      // bulanan - use first day of each month
      let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      while (cur <= last) {
        const label = formatMonthStart(cur);
        series.push({ label, total: map.get(label) || 0 });
        cur = addMonths(cur, 1);
      }
    }

    return new Response(JSON.stringify({ mode, start: startStr, end: endStr, data: series }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("STATISTIK ERROR:", err);
    return new Response(JSON.stringify({ mode: null, start: null, end: null, data: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
