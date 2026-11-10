import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Plus,
  Upload,
  Users,
} from "lucide-react";
import type { DashboardData } from "@/lib/server/assessment";
import { BKT, MASTERY_THRESHOLD } from "@/lib/domain/bkt";
import {
  Badge,
  Card,
  date,
  Empty,
  EstimateNote,
  PageTitle,
  percent,
  ProgressBar,
  TextLink,
} from "./ui";
import { StartButton } from "./actions";
import { SUBJECT_NAMES } from "@/lib/subjects";

export function TopicBars({
  data,
  teacher = false,
}: {
  data: DashboardData;
  teacher?: boolean;
}) {
  return (
    <div className="topic-bars">
      {data.topics.map((topic, index) => {
        const values = data.mastery.filter((m) => m.topic_id === topic.id);
        const p = teacher
          ? data.students.length
            ? data.students.reduce(
                (sum, s) =>
                  sum +
                  (values.find((m) => m.student_id === s.id)?.p_l ??
                    BKT.initial),
                0,
              ) / data.students.length
            : BKT.initial
          : (values.find((m) => m.student_id === data.actor.id)?.p_l ??
            BKT.initial);
        const attempted = teacher
          ? values.length > 0
          : values.some((m) => m.student_id === data.actor.id);
        return (
          <div className="topic-bar-row" key={topic.id}>
            <span className="topic-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="topic-bar-main">
              <div>
                <strong>{topic.name}</strong>
                <span className="tabular">{percent(p)}</span>
              </div>
              <ProgressBar value={p} label={`Estimasi BKT ${topic.name}`} />
              <small>
                {!attempted
                  ? `Belum ada latihan · prior ${percent(BKT.initial)}`
                  : p >= MASTERY_THRESHOLD
                    ? "Ambang estimasi tercapai"
                    : p > 0.6
                      ? "Penguatan berkala"
                      : "Perlu penguatan"}
              </small>
            </div>
            <span
              className={`mastery-marker ${p >= MASTERY_THRESHOLD ? "reached" : ""}`}
            >
              {p >= MASTERY_THRESHOLD ? <Check size={14} /> : <span />}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  index,
}: {
  label: string;
  value: React.ReactNode;
  detail: string;
  index: string;
}) {
  return (
    <div className="metric">
      <div className="metric-label">
        <span>{label}</span>
        <span>{index}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}

function RecentSessions({ data }: { data: DashboardData }) {
  const sessions = [...data.sessions]
    .filter((s) => s.status === "completed")
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, 3);
  return (
    <Card className="history-card">
      <div className="section-head">
        <div>
          <div className="section-label">CATATAN BELAJAR</div>
          <h2>Latihan terakhir</h2>
        </div>
        <TextLink href="/riwayat">Semua riwayat</TextLink>
      </div>
      {sessions.length ? (
        <div className="history-list">
          {sessions.map((s) => {
            const attempts = data.attempts.filter((a) => a.session_id === s.id);
            return (
              <Link className="history-row" key={s.id} href={`/hasil/${s.id}`}>
                <span className="history-symbol">
                  <BookOpen size={17} />
                </span>
                <div>
                  <strong>
                    {data.topics.find((t) => t.id === s.topic_id)?.name}
                  </strong>
                  <small>
                    {date(s.started_at)} · {attempts.length} soal
                  </small>
                </div>
                <span className="history-score tabular">
                  {attempts.filter((a) => a.is_correct).length}
                  <span> / {attempts.length} benar</span>
                </span>
                <ArrowUpRight size={17} />
              </Link>
            );
          })}
        </div>
      ) : (
        <Empty>
          Belum ada latihan selesai. Hasil sesi akan muncul di sini.
        </Empty>
      )}
    </Card>
  );
}

export function StudentDashboard({ data }: { data: DashboardData }) {
  const attempts = data.attempts;
  const correct = attempts.filter((a) => a.is_correct).length;
  const active = data.activeSession;
  const recommended = data.recommendations.find(
    (r) =>
      (data.questionCounts.find((q) => q.topic_id === r.topic_id)?.count ?? 0) >
      0,
  );
  const nextTopic = active
    ? data.activeTopic
    : data.topics.find((t) => t.id === recommended?.topic_id);
  const available = data.questionCounts.reduce((sum, q) => sum + q.count, 0);
  const classes = data.classes.map((c) => c.name).join(", ");
  const reached = data.mastery.filter((m) => m.p_l >= MASTERY_THRESHOLD).length;
  return (
    <>
      <PageTitle
        eyebrow={`RUANG SISWA / ${data.subject ? SUBJECT_NAMES[data.subject].toUpperCase() : "TIGA MAPEL WAJIB"} XII`}
        title="Ringkasan belajar"
        description={`Halo, ${data.actor.full_name.split(" ")[0]}. Lihat hasilmu dan tentukan latihan berikutnya.`}
        action={
          <span className="context-chip">
            <Users size={14} />
            {classes || "Belum tergabung di kelas"}
          </span>
        }
      />
      {data.cbt && (
        <Card className="mb">
          <p className="eyebrow">ASESMEN KELAS</p>
          <h2>Siap mengikuti asesmen?</h2>
          <p>
            24 soal per mapel dengan waktu pengerjaan. Siapkan kode ujian dari
            guru; hasil dibuka setelah ujian selesai.
          </p>
          <Link className="btn primary mt" href="/ujian">
            Buka Asesmen
          </Link>
        </Card>
      )}
      <section className="practice-panel">
        <div className="practice-content">
          <div className="panel-eyebrow">
            <span className="live-dot" />
            {active
              ? "SESI BELUM SELESAI"
              : nextTopic
                ? "LATIHAN BERIKUTNYA"
                : "MULAI DARI KELAS"}
          </div>
          <h2>{nextTopic?.name ?? "Bank soal menunggu guru."}</h2>
          <p>
            {nextTopic
              ? active
                ? "Lanjutkan sesi sebelumnya. Jawaban yang sudah dikirim tetap tersimpan."
                : recommended?.reason
              : data.classes.length
                ? "Guru belum menambahkan soal untuk kelasmu. Materi dan latihan akan tersedia setelah guru mengunggah bank soal."
                : "Gabung menggunakan kode kelas dari guru. Latihan hanya menggunakan soal yang dikelola guru kelasmu."}
          </p>
          <div className="practice-actions">
            {active ? (
              <Link href={`/kuis/${active.id}`} className="btn inverse">
                Lanjutkan latihan <ArrowRight size={17} />
              </Link>
            ) : recommended ? (
              <StartButton topicId={recommended.topic_id}>
                Mulai latihan
              </StartButton>
            ) : (
              <Link className="btn inverse" href="/kelas">
                {data.classes.length ? "Lihat kelas" : "Gabung kelas"}
                <ArrowRight size={16} />
              </Link>
            )}
            {nextTopic && (
              <Link
                className="panel-link"
                href={`/latihan?mapel=${data.subject ?? "matematika"}`}
              >
                Pilih topik lain <ArrowUpRight size={15} />
              </Link>
            )}
          </div>
          <div className="practice-meta">
            <Clock3 size={14} />
            <span>Maksimal 10 soal</span>
            <span className="meta-dot" />
            <span>Tanpa batas waktu</span>
          </div>
        </div>
        <div className="practice-aside">
          <div className="aside-label">SUMBER LATIHAN</div>
          <div className="bank-counter tabular">
            {available}
            <span>soal</span>
          </div>
          <p>Dari bank soal guru kelasmu</p>
          <div className="aside-rule" />
          <span className="aside-label">ALUR SESI</span>
          <ol>
            <li>
              <span>1</span>Kerjakan soal
            </li>
            <li>
              <span>2</span>Baca pembahasan
            </li>
            <li>
              <span>3</span>Lihat tindak lanjut
            </li>
          </ol>
        </div>
      </section>
      <div className="metrics-strip">
        <Metric
          label="Soal dikerjakan"
          value={attempts.length}
          detail="Seluruh riwayat latihan"
          index="01"
        />
        <Metric
          label="Jawaban benar"
          value={attempts.length ? percent(correct / attempts.length) : "—"}
          detail={`${correct} benar dari ${attempts.length} jawaban`}
          index="02"
        />
        <Metric
          label="Ambang BKT tercapai"
          value={
            <>
              {reached}
              <span className="metric-unit">/ {data.topics.length}</span>
            </>
          }
          detail={`Estimasi model ≥ ${percent(MASTERY_THRESHOLD)}`}
          index="03"
        />
      </div>
      <div className="dashboard-columns">
        <Card>
          <div className="section-head">
            <div>
              <div className="section-label">PENGUASAAN TOPIK</div>
              <h2>Peta pemahaman</h2>
              <p>Estimasi dari urutan jawabanmu, diperbarui setiap latihan.</p>
            </div>
            <Badge>BKT</Badge>
          </div>
          <TopicBars data={data} />
          <EstimateNote />
        </Card>
        <Card className="recommendation-card">
          <div className="section-head">
            <div>
              <div className="section-label">TINDAK LANJUT</div>
              <h2>Rencana belajar</h2>
            </div>
            <ArrowUpRight size={19} />
          </div>
          <div className="recommendation-list">
            {data.recommendations.slice(0, 3).map((r, i) => (
              <div className="plan-row" key={r.topic_id}>
                <span className="step-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <strong>{r.name}</strong>
                  <p>{r.reason}</p>
                  <span className="plan-value">BKT {percent(r.p_l)}</span>
                </div>
              </div>
            ))}
          </div>
          <TextLink href={`/rekomendasi?mapel=${data.subject ?? "matematika"}`}>
            Lihat rencana & materi
          </TextLink>
        </Card>
      </div>
      <RecentSessions data={data} />
    </>
  );
}

export function TeacherDashboard({ data }: { data: DashboardData }) {
  const activeStudents = new Set(data.attempts.map((a) => a.student_id)).size;
  const questions = data.questionCounts.reduce((sum, q) => sum + q.count, 0);
  const weak = data.topics
    .map((t) => ({
      ...t,
      p: data.students.length
        ? data.students.reduce(
            (sum, s) =>
              sum +
              (data.mastery.find(
                (m) => m.student_id === s.id && m.topic_id === t.id,
              )?.p_l ?? BKT.initial),
            0,
          ) / data.students.length
        : BKT.initial,
    }))
    .sort((a, b) => a.p - b.p)[0];
  return (
    <>
      <PageTitle
        eyebrow="RUANG GURU / SMAN 1 PARUNG PANJANG"
        title="Ringkasan kelas"
        description={`Selamat datang, ${data.actor.full_name.split(" ")[0]}. Kelola asesmen dan tindak lanjut siswa.`}
        action={
          <Link href="/kelas" className="btn secondary">
            <Plus size={16} />
            Kelola kelas
          </Link>
        }
      />
      {data.cbt && (
        <Card className="mb">
          <p className="eyebrow">ASESMEN KELAS</p>
          <h2>Kelola asesmen</h2>
          <p>
            Tinjau paket, buka ujian untuk kelas, lalu rilis hasil setelah semua
            pengerjaan dikumpulkan.
          </p>
          <Link className="btn primary mt" href="/ujian">
            Kelola Asesmen
          </Link>
        </Card>
      )}
      <section className="practice-panel teacher-panel">
        <div className="practice-content">
          <div className="panel-eyebrow">
            <span className="live-dot" />
            BANK SOAL GURU
          </div>
          <h2>
            {questions
              ? "Bank soal siap digunakan."
              : "Siapkan latihan untuk kelas."}
          </h2>
          <p>
            {questions
              ? `${questions} soal Anda tersimpan dalam bank. Siswa di kelas Anda dapat menggunakannya untuk latihan adaptif.`
              : "Buka Paket kelas XII, tinjau soal, lalu tambahkan ke bank Anda. Setelah siswa bergabung ke kelas, mereka dapat langsung berlatih."}
          </p>
          <div className="practice-actions">
            {!questions && (
              <Link className="btn inverse" href="/paket-soal">
                Siapkan paket latihan
              </Link>
            )}
            <Link className="btn inverse" href="/impor">
              <Upload size={17} />
              Unggah soal CSV
            </Link>
            <Link href="/bank-soal" className="panel-link">
              Kelola bank soal <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="practice-meta">
            <Check size={14} />
            <span>Kunci dinilai di server</span>
            <span className="meta-dot" />
            <span>Akses sesuai kelas</span>
          </div>
        </div>
        <div className="practice-aside">
          <span className="aside-label">SOAL ANDA</span>
          <div className="bank-counter tabular">
            {questions}
            <span>soal</span>
          </div>
          <p>
            {data.questionCounts.filter((q) => q.count > 0).length} topik sudah
            memiliki soal
          </p>
          <div className="aside-rule" />
          <Link className="panel-link" href="/panduan">
            Panduan pengelolaan <ArrowUpRight size={14} />
          </Link>
        </div>
      </section>
      <div className="metrics-strip">
        <Metric
          label="Siswa tergabung"
          value={data.students.length}
          detail={`Dalam ${data.classes.length} kelas Anda`}
          index="01"
        />
        <Metric
          label="Siswa pernah berlatih"
          value={activeStudents}
          detail="Memiliki minimal satu jawaban"
          index="02"
        />
        <Metric
          label="Jawaban tersimpan"
          value={data.attempts.length}
          detail={`${data.sessions.filter((s) => s.status === "completed").length} sesi selesai`}
          index="03"
        />
      </div>
      <div className="dashboard-columns">
        <Card>
          <div className="section-head">
            <div>
              <div className="section-label">HASIL ASESMEN</div>
              <h2>Penguasaan per topik</h2>
              <p>Rata-rata kelas. Siswa tanpa riwayat memakai prior model.</p>
            </div>
            <TextLink href={`/rekap?mapel=${data.subject ?? "matematika"}`}>
              Detail
            </TextLink>
          </div>
          {data.students.length ? (
            <TopicBars teacher data={data} />
          ) : (
            <Empty>
              Belum ada siswa. Buat kelas dan bagikan kode kelasnya.
            </Empty>
          )}
          <EstimateNote />
        </Card>
        <Card className="recommendation-card">
          <div className="section-head">
            <div>
              <div className="section-label">FOKUS PENDAMPINGAN</div>
              <h2>Perlu perhatian</h2>
            </div>
          </div>
          {data.students.length && weak ? (
            <>
              <span className="context-chip">Rata-rata terendah</span>
              <h3 className="focus-topic">{weak.name}</h3>
              <p className="focus-value tabular">{percent(weak.p)}</p>
              <p className="muted">
                Angka ini menyertakan prior untuk siswa yang belum berlatih.
                Tinjau jawaban per siswa sebelum menentukan tindak lanjut.
              </p>
              <TextLink href={`/rekap?mapel=${data.subject ?? "matematika"}`}>
                Tinjau hasil siswa
              </TextLink>
            </>
          ) : (
            <Empty>Ringkasan tersedia setelah siswa bergabung.</Empty>
          )}
        </Card>
      </div>
      <Card>
        <div className="section-head">
          <div>
            <div className="section-label">KELOLA PESERTA</div>
            <h2>Kelas Anda</h2>
          </div>
          <TextLink href="/kelas">Semua kelas</TextLink>
        </div>
        {data.classes.length ? (
          data.classes.map((room) => (
            <Link key={room.id} className="history-row" href="/kelas">
              <span className="history-symbol">
                <Users size={18} />
              </span>
              <div>
                <strong>{room.name}</strong>
                <small>
                  {data.members.filter((m) => m.class_id === room.id).length}{" "}
                  siswa tergabung
                </small>
              </div>
              <span className="class-code-label tabular">
                {room.class_code}
              </span>
              <ChevronRight size={17} />
            </Link>
          ))
        ) : (
          <Empty>Buat kelas pertama Anda untuk mengundang siswa.</Empty>
        )}
      </Card>
    </>
  );
}
