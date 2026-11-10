"use client";
import { useEffect, useState } from "react";
import { activityLabels, type Monitor } from "@/lib/assessment-support";
const time = (s: string) =>
  new Date(s).toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
export function AssessmentMonitor({
  data,
  active,
}: {
  data: Monitor | null;
  active: boolean;
}) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setNow(Date.now()));
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
    };
  }, []);
  if (!data)
    return <span className="small muted">Belum ada laporan perangkat.</span>;
  const stale = now > 0 && now - Date.parse(data.last_seen) > 65000;
  const status = !active
    ? "Pengerjaan selesai"
    : stale
      ? "Sinyal belum diterima; periksa koneksi"
      : data.visible
        ? "Halaman terlihat"
        : "Halaman tidak terlihat";
  return (
    <div className="assessment-monitor">
      <strong>{status}</strong>
      <p className="small">
        Keluar halaman: {data.left_count} · Meninggalkan tab:{" "}
        {data.hidden_count} · Kehilangan fokus: {data.blur_count} · Keluar layar
        penuh: {data.fullscreen_exits} · Laporan koneksi putus:{" "}
        {data.offline_count}
      </p>
      <p className="small muted">Laporan terakhir {time(data.last_seen)} WIB</p>
      <details>
        <summary>Riwayat aktivitas terakhir</summary>
        <ul>
          {data.recent.map((e, i) => (
            <li key={i}>
              {time(e.received_at)} · {activityLabels[e.kind]}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
