import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Check } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { Brand } from "@/components/brand";
import styles from "@/components/public.module.css";

const subjects = [
  {
    number: "01",
    name: "Matematika",
    mark: "x²",
    description:
      "Menalar, membaca data, dan menyelesaikan masalah secara bertahap.",
  },
  {
    number: "02",
    name: "Bahasa Indonesia",
    mark: "Aa",
    description:
      "Memahami bacaan, menimbang informasi, dan menghubungkan gagasan.",
  },
  {
    number: "03",
    name: "Bahasa Inggris",
    mark: "En",
    description:
      "Mengenali informasi, maksud, dan konteks dalam berbagai teks.",
  },
];

export default function Home() {
  return (
    <div className={styles.publicPage}>
      <a className="skip-link" href="#main">
        Langsung ke konten
      </a>
      <PublicHeader />
      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span /> Ruang belajar siswa SMA · Kelas XII
            </p>
            <h1 id="hero-title">
              Belajar dimulai
              <br />
              dari <em>memahami.</em>
            </h1>
            <p className={styles.heroDescription}>
              Kenali yang sudah kamu pahami dan bagian yang masih perlu dilatih.
              Temukan langkah belajar berikutnya bersama guru.
            </p>
            <div className={styles.heroActions}>
              <Link href="/registrasi" className="btn primary">
                Mulai belajar <ArrowUpRight size={18} />
              </Link>
              <a href="#cara-belajar" className={styles.plainLink}>
                Kenali Adaptiva <ArrowRight size={16} />
              </a>
            </div>
            <p className={styles.heroNote}>
              Matematika, Bahasa Indonesia, dan Bahasa Inggris.
            </p>
          </div>
          <aside
            className={styles.studyNote}
            aria-label="Tentang proses belajar"
          >
            <div className={styles.noteTop}>
              <BookOpen size={21} strokeWidth={1.5} />
              <span>SEBUAH PENGINGAT</span>
              <span>01</span>
            </div>
            <p className={styles.noteTitle}>
              Yang belum dipahami
              <br />
              masih bisa <em>dipelajari.</em>
            </p>
            <p className={styles.noteDescription}>
              Setiap latihan memberi kesempatan untuk melihat kembali cara kita
              berpikir.
            </p>
            <div className={styles.noteSteps}>
              <span>
                <Check size={15} /> Kerjakan dengan jujur
              </span>
              <span>
                <Check size={15} /> Pelajari pembahasannya
              </span>
              <span>
                <Check size={15} /> Coba langkah berikutnya
              </span>
            </div>
            <div className={styles.noteBottom}>
              <span>CATATAN UNTUK PROSES BELAJARMU.</span>
              <ArrowUpRight size={19} />
            </div>
          </aside>
        </section>
        <section
          id="mata-pelajaran"
          className={styles.subjectSection}
          aria-labelledby="subjects-title"
        >
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>Ruang untuk berlatih</p>
            <h2 id="subjects-title">
              Tiga pelajaran.
              <br />
              Satu langkah lebih paham.
            </h2>
            <p>
              Latihan per topik untuk mendampingi pembelajaran kelas XII. Soal
              dipilih dan dikelola oleh guru.
            </p>
          </div>
          <div className={styles.subjectList}>
            {subjects.map((subject) => (
              <div key={subject.number} className={styles.subjectRow}>
                <span className={styles.subjectNumber}>{subject.number}</span>
                <div>
                  <h3>{subject.name}</h3>
                  <p>{subject.description}</p>
                </div>
                <span className={styles.subjectMark} aria-hidden="true">
                  {subject.mark}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section
          id="cara-belajar"
          className={styles.processSection}
          aria-labelledby="process-title"
        >
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>Cara belajar di Adaptiva</p>
            <h2 id="process-title">
              Sedikit demi sedikit,
              <br />
              dengan tujuan yang jelas.
            </h2>
            <Link href="/registrasi" className={styles.plainLink}>
              Buat akun siswa <ArrowRight size={17} />
            </Link>
          </div>
          <ol className={styles.processList}>
            <li>
              <span>01</span>
              <div>
                <h3>Masuk ke kelasmu</h3>
                <p>
                  Daftar dengan email aktif, konfirmasikan akun, lalu gunakan
                  kode kelas dari guru.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Kerjakan, lalu pelajari kembali</h3>
                <p>
                  Mulai latihan per topik. Baca pembahasan untuk memahami alasan
                  di balik setiap jawaban.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Tentukan langkah selanjutnya</h3>
                <p>
                  Lihat hasil dan saran latihan. Diskusikan bagian yang sulit
                  bersama guru.
                </p>
              </div>
            </li>
          </ol>
        </section>
        <section
          id="untuk-guru"
          className={styles.teacherSection}
          aria-labelledby="teacher-title"
        >
          <div>
            <p className={styles.eyebrow}>Untuk guru</p>
            <h2 id="teacher-title">
              Pendampingan tetap
              <br />
              berawal dari guru.
            </h2>
          </div>
          <div>
            <p>
              Kelola kelas, susun atau unggah soal, dan lihat hasil latihan
              siswa per topik. Hasil asesmen menjadi bahan percakapan untuk
              menentukan bantuan yang dibutuhkan siswa.
            </p>
            <Link href="/login" className={styles.teacherLink}>
              Masuk ke ruang guru <ArrowUpRight size={19} />
            </Link>
            <small>Akun guru disiapkan oleh pengelola sekolah.</small>
          </div>
        </section>
        <section className={styles.faqSection} aria-labelledby="faq-title">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>Sebelum memulai</p>
            <h2 id="faq-title">Hal yang perlu diketahui.</h2>
          </div>
          <div className={styles.faqList}>
            <details>
              <summary>Apakah hasil latihan menentukan nilai sekolah?</summary>
              <p>
                Hasil latihan membantu melihat perkembangan pemahaman.
                Penggunaan hasil untuk penilaian dan tindak lanjut tetap menjadi
                pertimbangan guru.
              </p>
            </details>
            <details>
              <summary>Bagaimana cara bergabung ke kelas?</summary>
              <p>
                Buat akun siswa menggunakan email aktif. Setelah mengonfirmasi
                email dan masuk, buka Kelas saya lalu masukkan kode yang
                dibagikan guru.
              </p>
            </details>
            <details>
              <summary>Siapa yang menyiapkan soal?</summary>
              <p>
                Guru mengelola soal melalui editor atau unggah CSV. Siswa
                mengakses latihan yang disediakan untuk kelasnya.
              </p>
            </details>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <Brand href="/" />
        <p>
          Dikembangkan melalui program pengabdian kepada masyarakat bersama
          mitra SMA.
        </p>
        <Link href="/login">
          Ruang belajar <ArrowUpRight size={15} />
        </Link>
      </footer>
    </div>
  );
}
