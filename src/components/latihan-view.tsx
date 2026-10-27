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
  return (
    <>
      <PageTitle
        eyebrow="LATIHAN ADAPTIF"
        title="Pilih latihan"
        description="Soal berasal dari bank guru kelasmu. Tingkat kesulitan mengikuti hasil jawaban."
      />
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
        {data.topics.map((t, i) => {
          const mastery =
            data.mastery.find((m) => m.topic_id === t.id)?.p_l ?? BKT.initial;
          const count =
            data.questionCounts.find((q) => q.topic_id === t.id)?.count ?? 0;
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
              {count ? (
                <StartButton secondary topicId={t.id} />
              ) : (
                <Badge>Soal belum tersedia</Badge>
              )}
            </Card>
          );
        })}
      </div>
      <EstimateNote />
    </>
  );
}
