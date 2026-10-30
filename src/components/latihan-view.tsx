"use client";
import type { DashboardData } from "@/lib/server/assessment";
import { BKT } from "@/lib/domain/bkt";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import {
  Badge,
  Card,
  EstimateNote,
  PageTitle,
  percent,
  ProgressBar,
} from "@/components/ui";
import { StartButton } from "@/components/actions";
export function PracticeView({ data }: { data: DashboardData }) {
  const active = data.activeSession;
  const topics = new Map(data.topics.map((t) => [t.id, t]));
  const ordered = [...data.recommendations, ...data.waitingRecommendations].map(
    (r) => topics.get(r.topic_id)!,
  );
  return (
    <>
      <PageTitle
        eyebrow="LATIHAN ADAPTIF"
        title="Pilih latihan"
        description="Soal berasal dari bank guru kelasmu. Tingkat kesulitan mengikuti hasil jawaban."
      />
      {data.recommendations.length === 0 && (
        <Card className="notice">
          <h2>Latihan sedang disiapkan guru</h2>
          <p>
            {data.classes.length
              ? "Belum ada soal yang tersedia untuk mapel ini. Hubungi guru kelasmu."
              : "Bergabunglah ke kelas agar soal dari gurumu tersedia."}
          </p>
          {!data.classes.length && (
            <Link href="/kelas" className="text-link">
              Bergabung ke kelas
            </Link>
          )}
        </Card>
      )}
      {active && (
        <Card className="notice">
          <strong>Ada latihan yang belum selesai.</strong>
          <p>Lanjutkan sesi sebelumnya sebelum memulai sesi lain.</p>
          <Link href={`/kuis/${active.id}`} className="btn primary">
            Lanjutkan latihan <ArrowRight size={17} />
          </Link>
        </Card>
      )}
      <div className="topic-grid">
        {ordered.map((t, i) => {
          const mastery =
            data.mastery.find((m) => m.topic_id === t.id)?.p_l ?? BKT.initial;
          const count =
            data.questionCounts.find((q) => q.topic_id === t.id)?.count ?? 0;
          const ready = data.recommendations.some((r) => r.topic_id === t.id);
          return (
            <Card key={t.id} className="topic-card">
              <div className="section-head">
                <span className={`topic-icon topic-${i % 4}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {data.recommendations[0]?.topic_id === t.id && (
                  <Badge tone="amber">Direkomendasikan</Badge>
                )}
              </div>
              <h2>{t.name}</h2>
              <p>{t.description}</p>
              <div className="rec-mastery">
                <span>Estimasi BKT</span>
                <strong>{percent(mastery)}</strong>
              </div>
              <ProgressBar value={mastery} label={`BKT ${t.name}`} />
              <p className="topic-meta">
                <BookOpen size={14} />
                {count} soal tersedia · Maksimal 10 per sesi
              </p>
              {ready ? (
                <StartButton secondary topicId={t.id} />
              ) : (
                <Badge>
                  {count
                    ? "Menunggu soal pada tingkat yang sesuai"
                    : "Soal belum tersedia"}
                </Badge>
              )}
            </Card>
          );
        })}
      </div>
      <EstimateNote />
    </>
  );
}
