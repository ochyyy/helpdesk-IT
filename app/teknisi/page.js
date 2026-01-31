"use client";

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

const BASE_IMG = "/uploads/";

export default function TeknisiPage() {
  const [laporan, setLaporan] = useState([]);
  const [chart, setChart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("harian");

  // ================= FETCH LAPORAN =================
  const fetchLaporan = async () => {
    try {
      const res = await fetch("/api/teknisi/laporan");
      const data = await res.json();
      setLaporan(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setLaporan([]);
    }
  };

  // ================= FETCH GRAFIK =================
  const fetchChart = async (m = mode) => {
    try {
      const res = await fetch(`/api/teknisi/statistik?mode=${m}`);
      const json = await res.json();
      // Backend may return { mode, start, end, data: [...] }
      const payload = Array.isArray(json) ? json : (json?.data ?? []);
      setChart(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error("fetchChart error:", err);
      setChart([]);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchLaporan();
      await fetchChart();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    fetchChart(mode);
  }, [mode]);

  if (loading) return <p className="p-6">Memuat...</p>;

  // ================= FILTER =================
  const baru = laporan.filter(l => l.status?.toLowerCase() === "baru");
  const proses = laporan.filter(l => l.status?.toLowerCase() === "diproses");
  const selesai = laporan.filter(l => l.status?.toLowerCase() === "selesai");

  // ================= GRAFIK =================
  // 🔥 JANGAN new Date() (tapi kita boleh parsing label string untuk formatting sederhana)
  const originalLabels = chart.map((c) => c.label);
  const labels = originalLabels; // kept for clarity for other logic
  const values = chart.map((c) => Number(c.total) || 0);

  // Helper formatters
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  const formatDayMonth = (d) => `${String(d.getUTCDate()).padStart(2, '0')} ${monthNames[d.getUTCMonth()]}`;
  const isoWeekStart = (year, week) => {
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const dayOfWeek = jan4.getUTCDay() || 7;
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() + (week - 1) * 7 - (dayOfWeek - 1));
    return monday;
  };
  const weekRangeLabel = (label) => {
    const m = label.match(/^(\d{4})-W(\d{2})$/);
    if (!m) return label;
    const year = Number(m[1]);
    const week = Number(m[2]);
    const start = isoWeekStart(year, week);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    if (start.getUTCMonth() === end.getUTCMonth()) {
      return `${String(start.getUTCDate()).padStart(2, '0')}-${String(end.getUTCDate()).padStart(2, '0')} ${monthNames[start.getUTCMonth()]}`;
    }
    return `${formatDayMonth(start)} - ${formatDayMonth(end)}`;
  };

  const formatLabel = (label, mode) => {
    if (!label) return "";
    if (mode === "harian") {
      const m = label.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) return `${m[3]} ${monthNames[Number(m[2]) - 1]}`;
      return label;
    }
    if (mode === "mingguan") {
      return weekRangeLabel(label);
    }
    const m = label.match(/^(\d{4})-(\d{2})-01$/);
    if (m) return `${monthNames[Number(m[2]) - 1]} ${m[1]}`;
    return label;
  };

  const displayLabels = labels.map((l) => formatLabel(l, mode));
  const maxVal = values.length ? Math.max(...values) : 0;
  const yStep = maxVal <= 5 ? 1 : Math.ceil(maxVal / 5);
  const allZero = values.every((v) => v === 0);
  const pointRadius = values.length > 60 ? 0 : 4;

  // For 'harian' mode, show only dates that have reports to reduce clutter
  let chartOrig = originalLabels.slice();
  let chartValuesUsed = values.slice();
  let chartLabelsUsed = displayLabels.slice();

  if (mode === 'harian') {
    // show only dates that have reports to reduce clutter for daily view
    const filtered = chartOrig
      .map((o, i) => ({ o, v: values[i], d: displayLabels[i] }))
      .filter((x) => x.v > 0);
    if (filtered.length > 0) {
      chartOrig = filtered.map((x) => x.o);
      chartValuesUsed = filtered.map((x) => x.v);
      chartLabelsUsed = filtered.map((x) => x.d);
    }
  }

  // recompute based on used dataset
  const maxValUsed = chartValuesUsed.length ? Math.max(...chartValuesUsed) : 0;
  const yStepUsed = maxValUsed <= 5 ? 1 : Math.ceil(maxValUsed / 5);

  // label sampling to avoid overcrowding
  const visibleTicks = mode === 'harian' ? 8 : mode === 'mingguan' ? 6 : 8;
  const tickStep = Math.max(1, Math.ceil(chartLabelsUsed.length / visibleTicks));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard Teknisi</h1>

      {/* ================= GRAFIK ================= */}
      <div className="bg-white p-5 rounded-xl shadow mb-10">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Grafik Laporan</h2>
          <div className="flex gap-2">
            {["harian", "mingguan", "bulanan"].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded text-sm ${
                  mode === m ? "bg-green-600 text-white" : "bg-gray-200"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="relative h-[280px]">
          {allZero ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-medium">
              Tidak ada data untuk ditampilkan
            </div>
          ) : (
            <Line
              data={{
                labels: chartLabelsUsed,
                datasets: [
                  {
                    label: "Jumlah Laporan",
                    data: chartValuesUsed,
                    borderColor: "#22c55e",
                    backgroundColor: "rgba(34,197,94,0.15)",
                    tension: 0.4,
                    fill: true,
                    pointRadius,
                    pointHoverRadius: Math.min(8, Math.max(4, pointRadius)),
                  },
                ],
              }}

              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (items) => {
                        const idx = items[0]?.dataIndex ?? 0;
                        const orig = chartOrig[idx];
                        if (!orig) return items[0]?.label;
                        if (mode === 'harian') return orig;
                        if (mode === 'mingguan') return `${orig} (${formatLabel(orig, 'mingguan')})`;
                        return orig;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    ticks: {
                      autoSkip: false,
                      callback: function(value, index) {
                        return index % tickStep === 0 ? this.getLabelForValue(index) : '';
                      },
                      maxRotation: 45,
                      minRotation: 25,
                    },
                    grid: { color: 'rgba(0,0,0,0.03)' },
                  },
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: yStepUsed,
                    },
                    suggestedMax: maxValUsed + yStepUsed,
                  }
                },
                interaction: { mode: 'index', intersect: false },
                elements: { point: { radius: pointRadius } },
              }}
            />
          )}
        </div>
      </div>

      <Section title="Laporan Baru" items={baru} />
      <Section title="Laporan Diproses" items={proses} />
      <Section title="Laporan Selesai" items={selesai} />
    </div>
  );
}

// ================= SECTION =================
function Section({ title, items }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold mb-3">{title}</h2>
      {items.length === 0 && (
        <p className="text-gray-400 text-sm">Tidak ada data</p>
      )}
      <div className="space-y-4">
        {items.map(item => (
          <LaporanCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// ================= CARD =================
function LaporanCard({ item }) {
  const img = item.gambar
    ? `${BASE_IMG}${item.gambar.replace(/^\/+/, "")}`
    : null;

  return (
    <div className="border rounded p-4 flex gap-4 bg-yellow-50">
      <div className="w-40 h-32 bg-white border flex items-center justify-center">
        {img ? (
          <img src={img} className="object-cover w-full h-full" />
        ) : (
          <span className="text-gray-400 text-sm">Tidak ada gambar</span>
        )}
      </div>

      <div className="flex-1">
        <h3 className="font-bold">{item.judul}</h3>

        <p className="text-sm text-gray-600">
          👤 {item.username} •{" "}
          {new Date(item.created_at).toLocaleString("id-ID")}
        </p>

        <p className="text-sm mt-1">
          <b>Kategori:</b> {item.kategori} |{" "}
          <b>Prioritas:</b> {item.prioritas} |{" "}
          <b>Status:</b> {item.status}
        </p>

        <p className="text-sm mt-2">
          <b>Deskripsi:</b> {item.deskripsi}
        </p>
      </div>
    </div>
  );
}
