# Hasil verifikasi — 23 Oktober 2026

Lingkungan implementasi: Windows, Node.js 24.21.0, Next.js 16.4.2, React 19.3.1, TypeScript 6.0.3, Supabase JS 2.118.0, SSR 0.12.7. Dependency exact dan lockfile disimpan. Tidak ada Supabase/Groq key sungguhan yang dipakai atau deployment eksternal yang dijalankan.

## Pemeriksaan yang benar-benar dijalankan

| Pemeriksaan                          | Hasil                                                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Instalasi dependency npm             | Berhasil                                                                                                                                                           |
| `npm run lint`                       | Lulus, tanpa error atau warning                                                                                                                                    |
| `npm run typecheck`                  | Lulus                                                                                                                                                              |
| `npm test`                           | **85 tes lulus**, tujuh berkas                                                                                                                                     |
| Migration + RLS + RPC                | Dijalankan pada PostgreSQL lokal PGlite dengan stub Auth dan role PostgreSQL; termasuk transaksi penilaian, revision usang, rollback atomik dan unique jawaban     |
| `npm run build`                      | Lulus menggunakan Webpack                                                                                                                                          |
| `npm run test:e2e`                   | **24 pemeriksaan HTTP demo lulus**, termasuk sesi 10 soal, login/logout, penolakan unggahan siswa, otorisasi, CSRF, input invalid, hasil dan ekspor                |
| Browser desktop                      | Login siswa/guru, logout, dashboard kedua peran, buat kelas, editor soal dan impor CSV berhasil                                                                    |
| Browser ponsel 390 × 844             | Menu navigasi, pemilihan topik, pengiriman jawaban, mudah → sedang → sulit, sesi selesai di ambang BKT, dan hasil berhasil; lebar dokumen tidak melampaui viewport |
| Console browser pada alur yang diuji | Tidak ada warning/error yang tercatat                                                                                                                              |

Percobaan awal Turbopack gagal memulai proses PostCSS pada Windows ini. Percobaan Webpack dalam sandbox terkena EPERM direktori build; build Webpack dengan izin proses yang memadai kemudian berhasil. Scripts dev/build kini memakai flag resmi `--webpack`. Endpoint Origin awal juga ditemukan menolak loopback karena Next menggunakan host internal berbeda; diperbaiki memakai APP_URL tetap dan diberi regression test.

Audit awal mendeteksi lima advisori high pada rantai dependency **alat lint** (braces melalui konfigurasi lint Next). Konfigurasi itu diganti aturan resmi ESLint/TypeScript/React Hooks/JSX a11y yang kompatibel; audit instalasi berikutnya melaporkan **0 vulnerabilities**. ESLint 9 dipakai karena plugin JSX a11y stabil yang tersedia belum mendeklarasikan kompatibilitas ESLint 10; npm menandai lini ESLint 9 tidak lagi didukung. Tinjau lagi kompatibilitas tooling sebelum pemeliharaan jangka panjang. Audit bukan jaminan tidak adanya kerentanan.

Test unit/domain meliputi nilai awal, rumus benar/salah, batas probabilitas, parameter invalid, penyebut nol, determinisme, batas kesulitan, prasyarat rekursif/0,6, tanpa prasyarat, bank kosong, fallback, tidak mengulang soal, batas sesi, prior lintas sesi, threshold, race jawaban, CSV BOM/kutip/baris invalid/duplikat, isolasi guru/siswa, field tambahan, Origin, ukuran stream, mode eksplisit, validasi data RPC/disk, Groq tanpa key/error/429/timeout/respons invalid dan satu klaim provider pada dua permintaan bersamaan.

Pengujian browser dan HTTP menambah data demo di `.data/demo.json`: latihan, kelas dan soal contoh pengujian. Ini tetap data simulasi yang berlabel. File tersebut diabaikan Git; dataset awal bisa dipulihkan dengan prosedur backup/reset di README.

Audit lockfile dengan `npm audit` pada implementasi awal berhasil dan melaporkan **0 vulnerabilities**. Revisi UI/bank soal tidak menambah atau mengubah dependency. Tangkapan layar build produksi revisi ini: [tema terang](screenshots/dashboard-light-v2.png), [tema gelap](screenshots/dashboard-dark-v2.png), [dashboard guru](screenshots/guru-light-v2.png), [unggah soal guru](screenshots/upload-guru-v2.png), dan [ponsel](screenshots/dashboard-mobile-v2.png). Menu ponsel tertutup memakai `display: none` sehingga tidak ikut urutan navigasi aksesibilitas. Pemeriksaan memakai viewport desktop 1280 × 900 dan ponsel 390 × 844, keduanya tanpa overflow horizontal. Pilihan tema bertahan setelah reload; menu ponsel dapat dibuka/ditutup dan Escape mengembalikan fokus ke tombol menu. Console tab produksi pada alur yang diperiksa tidak mencatat warning/error.

Migration lanjutan `20261023123926_teacher_managed_question_bank.sql` diuji setelah skema lama terpasang pada PostgreSQL lokal PGlite. Soal tanpa penulis guru tetap ada di tabel, tetapi tidak ikut snapshot latihan; trigger menolak soal yang bukan milik guru kelas siswa. Tes aplikasi juga memeriksa unggahan siswa, atribusi pembuat oleh server, isolasi bank guru lain, siswa tanpa kelas, impor invalid/duplikat, dan penutupan sesi seed lama tanpa mengubah jawaban/BKT. Browser berhasil memilih file CSV dari perangkat, mempratinjau dan mengimpor empat soal; validasi ulang melaporkan empat duplikat. CSV yang diimpor hanya mengubah data demo lokal.

Migration lama dan seed pengguna dipertahankan. Tidak ada SQL yang diterapkan ke proyek Supabase pengguna, dan prosedur `admin-promote-teacher.sql` tidak dijalankan. Langkah manual tersedia di [panduan pembaruan sekolah](UPDATE-SEKOLAH.md).

## Yang belum diverifikasi dengan layanan asli

- Supabase hosted: koneksi, Auth email/password, pengiriman email, konfirmasi, refresh cookie lewat jaringan, konfigurasi Data API, migration pada proyek pengguna, RLS melalui PostgREST, dan Supabase Security Advisor. Kredensial/proyek pengguna tidak disediakan.
- Groq: keberhasilan inferensi, akses model dan kuota paket Free untuk akun pengguna. Dokumentasi model/rate limits diperiksa; pemanggilan provider aktual tidak dilakukan. Error provider diuji dengan fungsi tiruan.
- Vercel: deployment, hosting URL, HTTPS, environment build/runtime, email redirect dan kuota akun. Tidak ada push, deployment, akun baru, pembelian, atau perubahan production.
- Browser fisik Android/iOS, pembaca layar, pengujian beban banyak siswa, kalibrasi BKT, validitas pedagogis soal, dan penelitian pengguna. Pemeriksaan ponsel memakai viewport browser, bukan perangkat fisik.

## Skenario wajib sebelum uji Supabase/sekolah

1. Pada proyek khusus uji, terapkan kedua migration sesuai urutan nama. Jika skema awal dan seed sudah terpasang, jalankan hanya migration lanjutan; seed tidak perlu diulang. Periksa semua RLS aktif dan fungsi commit/read/join tidak memiliki EXECUTE untuk anon/authenticated. Jalankan Security Advisor dan tinjau temuan.
2. Buat dua akun siswa S1/S2 dan dua guru G1/G2. Promosi guru hanya lewat SQL Editor administratif. S1 bergabung ke kelas G1, S2 ke kelas G2 dengan kode berbeda.
3. Pada client publishable key dengan token S1, coba SELECT attempts/mastery/profiles/sessions milik S2: hasil harus kosong. SELECT questions tidak boleh menghasilkan satu baris pun.
4. Dengan token S1, coba update role, insert/update attempts/mastery, akses RPC read/commit, dan join tanpa route kode server: harus ditolak permission/RLS. Mengubah full_name sendiri boleh; milik S2 tidak boleh berubah.
5. Dengan token G1, query kelas/anggota/hasil/soal G2: tidak boleh muncul. Endpoint bank guru serta pratinjau/commit impor harus menolak sesi siswa dan tanpa login. G1 hanya dapat mengedit soal miliknya. Unggah soal sebagai G1; soal tersebut hanya tersedia untuk S1 yang mengikuti kelas G1. Soal seed tanpa guru tidak boleh diterbitkan sebagai latihan.
6. Kerjakan satu sesi sebagai S1. Sebelum menjawab, periksa respons `/api/session/:id` pada Network: question hanya id/topic_id/question_text/options/difficulty. Setelah submit, feedback hanya untuk jawaban yang sudah disimpan. Jangan menyalin key administratif ke DevTools.
7. Kirim ulang jawaban identik dua kali secara paralel. Pastikan unique session–question, hanya satu attempt baru, dan satu pembaruan BKT. Ganti ID sesi menjadi milik S2 atau ID soal yang bukan giliran: harus ditolak.
8. Uji sesi expired, logout, refresh dan login kembali. Data siswa lain tidak boleh tersimpan dalam cache browser/CDN; respons data harus private/no-store. Uji konfirmasi email dengan URL lokal dan hosting yang benar.
9. Dengan Groq nonaktif/kosong, selesaikan sesi baru: ringkasan template dan rekomendasi tetap tersedia. Jika sengaja menguji Groq, pastikan paket Free dan batas akun, lalu amati satu panggilan per sesi; kegagalan/rate limit harus mempertahankan penilaian.
10. Di hosting, uji Origin APP_URL, akses role, impor invalid dan duplikat, ekspor hak guru serta tampilan ponsel. Pantau quota, waktu respons dan izin data peserta sebelum pengumpulan hasil penelitian.

Langkah di bagian ini disiapkan untuk administrator; belum diklaim dijalankan pada layanan pengguna. PGlite menggunakan mesin PostgreSQL lokal dan mock schema Auth, sehingga tidak menggantikan verifikasi konfigurasi Supabase asli.
