# Adaptiva — Asesmen dan rekomendasi belajar adaptif

**Kegiatan PKM SMAN 1 Parung Panjang:** alamat utama https://www.adaptiva-sman1pp.my.id. Lihat [panduan panitia](docs/PANDUAN-PANITIA-PKM.md) dan [verifikasi kesiapan 3 November](docs/VERIFIKASI-PKM-2026-11-03.md). Mode demo lokal kini menyiapkan 72 soal paket tiga mapel secara idempotent, di samping soal lama; data jawaban dan peran tetap. Penyimpanan sekolah tidak mengimpor apa pun saat halaman dibuka: bank sekolah tetap dikelola akun guru yang ditetapkan pengelola.

Platform **program pengabdian kepada masyarakat bersama mitra SMA**, dengan judul “Penerapan Sistem Asesmen serta Rekomendasi Belajar Berbasis Web dengan Dukungan Kecerdasan Artifisial”, untuk siswa kelas XII dan guru. Tiga mapel wajibnya **Matematika, Bahasa Inggris, dan Bahasa Indonesia**. Jawaban dinilai di server, penguasaan diperbarui dengan Bayesian Knowledge Tracing (BKT), lalu siswa mendapat urutan belajar berdasarkan penguasaan dan prasyarat per mapel.

**Sudah menjalankan assessment_core.sql dan seed.sql?** Ikuti [panduan pembaruan sekolah](docs/UPDATE-SEKOLAH.md). Terapkan migration bank guru `20261023123926_teacher_managed_question_bank.sql` jika belum, lalu `20261027034148_required_subjects_grade12.sql`; jangan mengulang skema lama atau seed. Soal untuk siswa harus dibuat, diunggah, atau diimpor setelah ditinjau guru kelasnya. Soal seed tanpa pemilik guru dipertahankan sebagai konten pengembangan dan tidak otomatis masuk latihan. Tema terang/gelap tersedia melalui tombol Tema.

**Paket kelas XII:** 72 soal orisinal (24 per mapel) dengan stimulus, kunci, pembahasan, dan pemetaan kompetensi. Guru membuka **Paket kelas XII**, meninjau isi per mapel, lalu mengimpor ke bank sendiri. Endpoint unduhan CSV berkunci juga khusus guru. [Acuan resmi dan batas cakupan](docs/KURIKULUM-KELAS-XII.md).

Dataset contoh bukan materi resmi sekolah, hasil penelitian, ataupun bukti kalibrasi ilmiah. Ambang BKT bukan sertifikasi kompetensi.

## Menjalankan demo lokal

Gunakan Node.js **24 LTS** dan npm. Versi dependency dikunci di `package-lock.json`.

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Di macOS/Linux gunakan `npm` dan `cp .env.example .env.local`. Buka **http://127.0.0.1:3000**. Pilih **Masuk sebagai siswa** (Rani Putri) atau **Masuk sebagai guru** (Maya Pramesti). Tidak perlu Supabase atau API key. Jangan memasukkan password sungguhan dalam mode demo.

`APP_MODE=demo` adalah default bila variabel belum diisi. Semua halaman aplikasi menampilkan label data simulasi. Dataset awal memiliki empat topik lama, 12 topik paket, dua siswa simulasi, satu kelas, 48 soal pengembangan, dan 15 percobaan awal yang menghasilkan statistik menggunakan rumus BKT yang sama. Untuk mencoba ketiga mapel, masuk guru dan impor tiap paket setelah meninjau isinya, lalu masuk siswa. Limit/turunan/integral lama diberi kategori pengayaan. Kode kelas contoh: `DEMO-XII`. Jawaban baru benar-benar disimpan pada `.data/demo.json`; folder ini diabaikan Git. Sesi login memakai cookie bertanda tangan, kedaluwarsa setelah delapan jam, dan berakhir jika proses server dimulai ulang. Login demo memakai identitas bersama untuk presentasi lokal, bukan keamanan akun produksi.

Untuk mengulang presentasi dari dataset awal: hentikan semua server, pindahkan `.data/demo.json` ke berkas cadangan, lalu mulai server. Jangan menjalankan dua proses demo pada folder yang sama. Mode demo memakai antrean proses dan penggantian berkas atomik, bukan penyimpanan terdistribusi. Mode ini sengaja ditolak di Vercel karena filesystem hosting tidak persisten.

## Fitur yang diimplementasikan

- Login email/password Supabase, registrasi siswa, konfirmasi email, refresh cookie SSR, pemeriksaan peran server, profil, dan logout.
- Kelas guru dengan kode acak, keanggotaan siswa idempotent, dan daftar anggota sesuai hak guru.
- Topik, materi HTTPS atau lokal, serta prasyarat dengan deteksi siklus di TypeScript dan PostgreSQL. Katalog topik dipakai bersama oleh guru dalam satu proyek sekolah.
- Bank soal guru empat pilihan, editor, kunci dan pembahasan, serta unggah CSV dengan validasi keseluruhan file, nomor baris, BOM UTF-8, kutip, dan pelaporan duplikat. Siswa tidak dapat mengunggah soal; latihan hanya mengambil soal milik guru kelas siswa. Tidak ada generator soal AI.
- Kuis adaptif maksimal 10 soal, penilaian server, BKT persisten lintas sesi, fallback kesulitan terdekat, tanpa pengulangan dalam sesi, dan pembatasan satu sesi aktif per siswa.
- Hasil dan pembahasan setelah penilaian, riwayat, peta BKT, rekomendasi prasyarat, dan materi guru.
- Dashboard guru dari data anggota kelas: pernah berlatih berarti memiliki minimal satu jawaban; rata-rata topik menyertakan prior model bagi anggota tanpa riwayat. Tidak ada klaim “aktif hari ini” tanpa data waktunya.
- Ekspor percobaan CSV guru dengan UUID pseudonim dan penetralan formula spreadsheet. Tidak memuat nama atau email.
- Ringkasan template wajib dan penjelasan Groq opsional, maksimal satu permintaan per sesi selesai, tanpa retry provider.

Semua fungsi inti berjalan tanpa LLM. Integrasi eksternal disediakan dalam kode; lihat [verifikasi pembaruan tiga mapel](docs/VERIFIKASI-2026-10-27.md) dan [skenario layanan eksternal](docs/VERIFIKASI.md) untuk membedakan pengujian lokal dan layanan yang belum diuji.

Navigasi mapel kini berjalan dari DTO pengguna yang sudah dimuat pada ringkasan, latihan, rekomendasi, rekap, dan paket guru. Tersedia tombol Aa untuk teks besar, tema konsisten, serta animasi yang mengikuti preferensi pengurangan gerak. Lihat [hasil verifikasi navigasi dan keterbacaan](docs/VERIFIKASI-NAVIGASI-DAN-KETERBACAAN.md).

## Arsitektur dan struktur

Next.js App Router + React + TypeScript strict + Tailwind CSS + Lucide. Route Handlers memakai Zod. Browser mengirim pilihan A/B/C/D, ID soal dan ID sesi; identitas pengguna berasal dari sesi yang diverifikasi, bukan request body.

```text
src/app/(workspace)/        Halaman siswa/guru yang dilindungi
src/app/api/                Auth, operasi tervalidasi, sesi, bank guru, ekspor
src/components/             Navigasi, UI, editor, CSV, kuis
src/lib/domain/bkt.ts       Parameter dan rumus BKT murni
src/lib/domain/adaptive.ts  Rekomendasi, siklus, seleksi dan DTO soal
src/lib/domain/csv.ts       Parser, validasi, fingerprint, ekspor aman
src/lib/validation.ts       Schema runtime Zod
src/lib/server/assessment.ts Otorisasi dan operasi asesmen
src/lib/server/repository.ts Adapter demo dan Supabase + transaksi
src/lib/server/explanation.ts Groq dan fallback deterministik
src/lib/supabase/           Client browser/server SSR
src/proxy.ts               Refresh cookie Supabase, no-store
src/lib/demo/seed.ts        Dataset simulasi dan generator bank contoh
supabase/migrations/       Skema, RLS, fungsi transaksi
supabase/seed.sql          Topik/soal contoh tanpa akun atau hasil siswa
public/csv/                Template dan contoh impor
tests/                     Algoritma, layanan, CSV, PostgreSQL/RLS
scripts/smoke.mjs          Skenario HTTP pada server demo lokal
```

Lihat [dokumen BKT](docs/BKT.md), [arsitektur keamanan](docs/KEAMANAN.md), dan [panduan pengguna](docs/PANDUAN.md).

## Menghubungkan Supabase

1. Buat proyek sendiri di [Supabase](https://supabase.com/dashboard), pilih paket **Free**, simpan password database secara privat. Aplikasi ini tidak membuat akun, membeli layanan, atau mengubah proyek Anda otomatis.
2. Di SQL Editor proyek baru, jalankan semua berkas pada `supabase/migrations/` sesuai urutan nama. Jika skema lama sudah dipasang, jalankan hanya migration lanjutan yang belum diterapkan. Jangan menjalankan ulang core pada tabel yang sudah ada. `supabase/seed.sql` opsional untuk konten pengembangan; tidak membuat akun atau hasil siswa. Soal sekolah disediakan guru melalui editor, unggah CSV, atau paket yang ditinjau. Seed tanpa pemilik guru tidak disajikan otomatis. Migration tiga mapel menambah metadata dan topik, bukan otomatis menerbitkan 72 soal.
3. Salin URL proyek, publishable key, dan **service role key** dari pengaturan API ke `.env.local`. Service role key tidak boleh dipublikasikan. RLS membatasi akses langsung Data API; penulisan asesmen memakai RPC administratif yang hanya bisa dipanggil service role setelah server memverifikasi pengguna dan otorisasinya.
4. Pilih `APP_MODE=supabase`. Jika konfigurasi salah, aplikasi menampilkan kegagalan konfigurasi; data sekolah tidak diganti dengan demo secara diam-diam.
5. Aktifkan provider email/password dan email confirmation. Atur **Site URL** dan redirect allowlist ke `http://127.0.0.1:3000` untuk lokal, atau origin HTTPS hosting Anda. Di template **Confirm signup**, gunakan tautan `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`. Route ini hanya menerima jenis `email` dan tidak menerima redirect bebas.
   Panduan khusus domain PKM, key Vercel, callback email, dan batas pendaftaran satu kelas tersedia di [konfigurasi produksi](docs/PRODUKSI-PKM.md).

6. Restart aplikasi. Daftarkan akun siswa dan uji konfirmasi serta login. Untuk uji kelas, siapkan guru dengan prosedur di bawah.

### Email pendaftaran dan penanganan error

Gunakan alamat email aktif milik pengguna. Supabase dapat menolak alamat contoh, domain uji, atau alamat yang tidak dapat digunakan dengan kode `email_address_invalid`. Formulir menampilkan pesan di kolom email; aplikasi tidak menonaktifkan validasi atau konfirmasi email untuk melewati penolakan tersebut.

Sebelum membuka pendaftaran bagi siswa, siapkan pengiriman email melalui [SMTP yang sesuai](https://supabase.com/docs/guides/auth/auth-smtp). Layanan email bawaan Supabase membatasi penerima ke anggota organisasi dan memiliki batas pengiriman. `email_address_not_authorized` membutuhkan konfigurasi layanan email oleh pengelola; mengubah isian siswa tidak memperbaikinya. Jangan mematikan konfirmasi email sebagai solusi. Kegagalan layanan dikembalikan sebagai 503, pembatasan sebagai 429, dan penolakan email/kata sandi sebagai 422 dengan petunjuk pada kolom terkait.

Beranda publik `/` menjelaskan mata pelajaran dan alur belajar. `/login` melayani siswa dan guru; `/registrasi` hanya menerima akun siswa. Pesan pendaftaran baru dan email yang sudah terdaftar tetap netral untuk menghindari pembocoran keberadaan akun. Log aplikasi hanya mencatat kode dan status kegagalan Auth, tanpa email, kata sandi, token, atau pesan mentah provider.

```dotenv
APP_MODE=supabase
APP_URL=http://127.0.0.1:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
GROQ_ENABLED=false
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
```

`APP_URL` harus sama persis dengan origin yang dibuka pengguna untuk validasi Origin/CSRF. Gunakan URL HTTPS hosting jika online. Jangan memberi prefix `NEXT_PUBLIC_` pada secret. `.env.local`, token, dan `.data` tidak boleh masuk Git. Client browser disiapkan untuk kebutuhan auth/fitur berikutnya; fitur penilaian saat ini selalu melalui server.

Pengguna CLI dapat meninjau `npx supabase --help`, `npx supabase link --help`, dan `npx supabase db --help` sesuai versi terpasang sebelum menghubungkan proyek dan menerapkan migration. Proyek ini tidak membutuhkan Docker untuk demo maupun tes PGlite.

### Menyiapkan guru pertama secara administratif

1. Administrator membuat akun guru di Supabase Dashboard → Authentication → Users, atau pengguna mendaftar biasa dan mengonfirmasi email. Akun baru **selalu** memiliki peran student, sekalipun metadata mengirim role teacher.
2. Administrator tepercaya membuka SQL Editor. Salin `supabase/admin-promote-teacher.sql`, ganti placeholder email di editor privat, tinjau UUID yang dituju, lalu jalankan. Jangan menambahkan email/password nyata ke repository.
3. Guru masuk, membuat kelas, lalu membagikan kode kelas kepada siswa. Tidak ada endpoint promosi guru dalam aplikasi. Jangan membagikan akses SQL Editor, service key, atau akun administrator kepada siswa.

Ulangi [skenario keamanan eksternal](docs/VERIFIKASI.md) dengan dua akun siswa dan dua guru sebelum uji sekolah. Pengujian PGlite bukan verifikasi layanan Auth/PostgREST Supabase yang sedang Anda pakai.

## Groq opsional dan batas biaya

Default `GROQ_ENABLED=false` dan API key kosong: ringkasan template tersedia. Aktifkan hanya setelah memastikan akun memakai paket Free, model tersedia, dan izin pengiriman data pembelajaran sudah sesuai:

```dotenv
GROQ_ENABLED=true
GROQ_API_KEY=YOUR_SERVER_ONLY_GROQ_KEY
GROQ_MODEL=openai/gpt-oss-20b
```

Perubahan `GROQ_MODEL` cukup melalui environment, kemudian restart/redeploy. Tidak ada fallback ke model atau provider lain. Penjelasan hanya diminta setelah sesi selesai: nama topik, estimasi BKT, maksimal tiga kesalahan beserta pembahasan, dan tiga rekomendasi inti; tanpa nama/email/ID siswa. Input dibatasi 4.500 karakter, output 600 token, timeout 6,5 detik, retry 0. Respons JSON divalidasi, dibatasi panjang, dan ditolak jika mengandung tautan atau angka tambahan. Urutan rekomendasi dan hasil ukur tetap dihitung aplikasi. Penjelasan natural-language tetap memerlukan pengawasan guru.

Klaim ringkasan disimpan sebelum provider dipanggil. Request ulang, error/rate limit, atau restart setelah klaim tidak memicu permintaan provider kedua; template yang sudah tersimpan tetap tersedia. Sumber template/Groq diberi label berbeda. Untuk menguji tanpa key: kosongkan key atau nonaktifkan `GROQ_ENABLED`, restart, selesaikan sesi baru; lihat label ringkasan. `npm test` juga menguji provider error 429, timeout, model gagal, dan respons rusak tanpa mengakses API.

Dokumen resmi diperiksa **23 Oktober 2026**; batas bisa berubah dan akses akun belum diverifikasi:

- [Groq models](https://console.groq.com/docs/models) mencantumkan `openai/gpt-oss-20b`. [Free rate limits](https://console.groq.com/docs/rate-limits) menampilkan 30 request/menit, 1.000 request/hari, 8.000 token/menit dan 200.000 token/hari untuk model ini, berlaku di tingkat organisasi dengan kemungkinan pengecualian. Periksa halaman Limits akun Anda sebelum mengaktifkan. Jangan memasang billing/upgrade otomatis.
- [Supabase Free](https://supabase.com/pricing): contoh batas 500 MB database, 50.000 MAU, 5 GB egress, maksimal dua proyek aktif; proyek dapat dipause setelah satu minggu tidak aktif. Kuota email Auth terpisah dan bisa membatasi pendaftaran/konfirmasi saat uji. Periksa status proyek sebelum presentasi.
- [Vercel Hobby](https://vercel.com/docs/plans/hobby): periksa kelayakan penggunaan pribadi/nonkomersial, kuota compute/transfer/request dan perilaku saat batas tercapai. Gunakan URL `.vercel.app`, tanpa membeli domain. Tidak ada janji gratis tanpa batas.

## CSV dan materi

Template: `public/csv/template-soal.csv`. Contoh empat soal baru: `public/csv/contoh-soal.csv`. Guru membuka **Unggah soal**, memilih file, menekan **Validasi & pratinjau**, memperbaiki seluruh kesalahan, lalu menekan **Impor soal valid**. Satu baris invalid membatalkan seluruh impor; duplikat yang sama dilewati dengan jumlah yang dilaporkan. Validasi diulang saat commit untuk menangani perubahan data sejak pratinjau.

```csv
topik,pertanyaan,opsi_a,opsi_b,opsi_c,opsi_d,kunci,kesulitan,pembahasan
limit-fungsi,"Nilai lim x→3 (4x+2)?",10,12,14,16,C,mudah,"Substitusi menghasilkan 14."
```

Kesulitan menerima mudah/sedang/sulit atau easy/medium/hard. Topik harus sudah ada. Pilihan wajib empat teks berbeda; kunci A–D. Parser mendukung BOM, CRLF, LF, tanda kutip ganda dan newline di field kutip. Batas file 500 KB/200 soal. Materi lokal contoh ada di `/materi/limit-fungsi`, `/materi/turunan-fungsi`, `/materi/integral-dasar`, `/materi/peluang-kejadian`. Guru bisa mengubah tautan di **Topik & materi**. Tautan eksternal tidak diklaim sudah diverifikasi.

## Menjalankan pemeriksaan

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd start
# Terminal kedua, server demo aktif di 127.0.0.1:3000:
npm.cmd run test:e2e
```

`test:e2e` adalah pengujian integrasi **HTTP**, bukan otomasi browser. Ini menambah latihan demo, menguji cookie, endpoint tanpa login, otorisasi, Origin, sesi hingga selesai per mapel, feedback, duplikasi, CSV dan ekspor. Jalankan hanya pada data demo lokal. Browser diuji secara terpisah; hasil pembaruan dicatat pada `docs/VERIFIKASI-2026-10-27.md` dan skenario eksternal pada `docs/VERIFIKASI.md`.

Build/dev memakai flag Webpack resmi Next.js karena Turbopack/PostCSS gagal memulai proses pada Windows lingkungan implementasi. Tidak ada API framework lama yang diperlukan. Tidak ada ketergantungan font/gambar eksternal untuk build.

## Deployment manual ke Vercel

Belum ada deployment atau push GitHub yang dilakukan. Setelah meninjau kode dan menyelesaikan tes eksternal:

1. Siapkan proyek Supabase Free dan akun guru; verifikasi RLS terlebih dahulu.
2. Pilih akun/proyek Vercel Hobby yang memenuhi ketentuan dan impor repository Anda secara manual. Pilih Next.js, Node 24, build `npm run build`.
3. Isi environment Supabase di **Production** dan **Preview** yang Anda gunakan; pilih `APP_MODE=supabase`, `APP_URL=https://alamat-proyek.vercel.app`. Simpan service key dan Groq key sebagai secret. Jangan menyalin `.data`.
4. Sesuaikan Site URL/redirect dan template email Supabase ke origin hosting. Jika origin preview berbeda, set `APP_URL` preview yang sesuai atau uji pada deployment tetap.
5. Deploy setelah persetujuan Anda. Verifikasi login siswa/guru, join kelas, kuis, hasil, logout dan penolakan akses lintas pengguna. Tinjau kuota dan log server tanpa mencatat token/password.

Tidak diperlukan domain berbayar, storage upload, Redis, Docker, database vektor, atau API AI berbayar.

## Uji coba PKM dan batasan

Gunakan proyek database khusus uji, informasikan tujuan kepada peserta/wali/sekolah dan peroleh persetujuan sesuai prosedur penelitian Anda. Pisahkan data demo dan data penelitian, tetapkan lama penyimpanan serta pengelola data, dan jangan mempublikasikan hasil individual. Ekspor **Hasil asesmen → CSV** untuk mengolah urutan jawaban, benar/salah dan `p_before`/`p_after`; UUID adalah pseudonim yang masih dapat dikaitkan kembali oleh administrator. Bedakan akurasi jawaban dari BKT saat menganalisis. Simpan konfigurasi parameter, waktu uji dan versi kode bersama analisis.

Arsitektur transaksi menggunakan snapshot terbatasi per aktor dan satu revision lock database: sederhana, atomik, dan cocok untuk kelompok uji kecil, tetapi bukan desain untuk ribuan siswa bersamaan. Dashboard/ekspor membaca seluruh riwayat yang diizinkan; pantau ukuran data. Pengaturan akademik/topik bersifat bersama satu proyek; bukan multi-sekolah dengan katalog terisolasi. Soal contoh peluang sengaja sederhana dan beberapa menguji konsep yang sama; tinjau validitas pedagogis bank soal sebelum penelitian. Tidak ada penghapusan via UI, supaya riwayat tidak rusak; koreksi/penghapusan data memerlukan prosedur administrator yang mempertimbangkan relasi dan persetujuan peserta.

Rate limit proses melindungi demo/satu instance; pada hosting multi-instance, perlindungan login global memerlukan konfigurasi rate limit Auth/platform. Batas satu sesi dan jumlah sesi/jam disimpan serta diperiksa dalam transaksi. Tidak ada password reset mandiri, penjadwalan tugas kelas, kalibrasi statistik parameter, atau ekspor anonim penuh dalam MVP ini. Itulah batasan implementasi, bukan fitur yang sudah tersedia. Tinjau deployment, ketentuan biaya, email Auth, dan pemeriksaan layanan eksternal sebelum uji sekolah.
