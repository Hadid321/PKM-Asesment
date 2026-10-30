# Perbaikan tindak lanjut asesmen — 30 Oktober 2026

## Masalah dan perubahan

Hasil latihan bahasa sebelumnya menyarankan Limit fungsi, yang merupakan pengayaan Matematika dan dapat tidak mempunyai soal. Latihan juga menandai topik kosong sebagai rekomendasi pertama. Perbaikan menyamakan konteks mapel/kategori dan ketersediaan soal pada dashboard, latihan, rencana, ringkasan hasil, serta input prioritas Groq.

Topik tanpa soal yang sesuai dipisahkan sebagai menunggu guru. BKT dan urutan prasyarat tetap dihitung; parameter prior/learn/guess/slip dan nilai historis tidak diubah. Siswa pada tingkat dasar tidak dipaksa melompat langsung ke soal sulit ketika bank dasar habis; sesi berakhir dengan alasan jelas. Sesi kosong tidak dibuat untuk bank yang hanya mempunyai soal sulit pada estimasi dasar.

Ringkasan utama hasil lama dihitung sebagai tampilan dari jawaban historis dan pilihan latihan terkini. Ringkasan database serta jawaban/kunci historis tidak ditulis ulang. Penjelasan Groq yang tersimpan tetap dapat dibaca sebagai catatan tambahan, sedangkan kartu tindak lanjut selalu berasal dari aturan aplikasi.

Setiap topik paket memiliki materi lokal dengan penjelasan, contoh dan latihan mandiri. Fallback hanya mengganti tampilan URL kosong atau rujukan kisi-kisi umum; URL khusus guru tetap dipakai. Validator URL menerima hanya daftar halaman materi yang tersedia atau HTTPS yang valid, tanpa memperluas izin ke path lokal sembarang.

Paket `kelas12-2026-10-30` memperbaiki jadwal perpustakaan/bus ING-02, menyediakan delapan stimulus Inggris 263–273 kata, dan memperbaiki distraktor IND-16. Posisi kunci seimbang dan deterministik, tanpa mengubah arti jawaban benar. Impor versi baru tidak mengganti soal lama otomatis. Cakupan K-13/Merdeka dan batas kompetensi dijelaskan sebelum guru mengimpor.

## Verifikasi

Pengujian memakai salinan sumber persis dari `main` GitHub `338754a6f3c8ecbdd9522871ee8cdafe730bd3ff` ditambah 25 berkas perbaikan ini. Perubahan UI/auth lain yang masih lokal tidak ikut dipublikasikan. Seluruh data uji berada di folder demo terpisah, tanpa key Supabase/Groq atau akses tulis production.

- **141 tes pada 13 berkas lulus**, termasuk transaksi PostgreSQL/RLS lokal, otorisasi, rekomendasi bank kosong, konteks mapel, materi, kunci soal, dan sesi lama. Penambahan pemeriksaan mandiri pada jalur `start` juga diuji ulang: 9 tes rencana belajar lulus.
- **Lint, TypeScript, dan build produksi Next.js 16.4.2 lulus.** Audit dependency produksi melalui registry npm resmi melaporkan 0 advisori; dependency/lockfile tidak diubah.
- **29 pemeriksaan HTTP demo lulus:** akses tanpa login, role injection, CSRF, isolasi siswa, kunci tersembunyi sebelum menjawab, idempotensi jawaban/impor, CSV, ekspor, dan sesi selesai ketiga mapel.
- **Browser guru:** mulai tanpa kelas/bank, membuat kelas, mengimpor 24 soal per mapel (72 total), lalu memeriksa rekap siswa.
- **Browser siswa:** petunjuk gabung kelas saat belum tergabung; gabung lewat kode; rekomendasi Matematika mendahulukan Transformasi fungsi yang tersedia, sedangkan Peluang kejadian tanpa soal berada terakhir tanpa tombol mulai. Empat jawaban salah mengakhiri sesi sebelum soal sulit, dengan alasan meminta guru melengkapi tingkat yang sesuai. Hasil Bahasa Inggris 3/3 dan BKT 98% menyarankan Narrative reading; tombolnya berhasil membuka sesi Narrative reading. Rekap guru cocok: Matematika 0/4, BKT 11%; Inggris 3/3, BKT 98%.
- **Materi dan tampilan browser:** materi Transformasi fungsi memiliki contoh dan pembahasan latihan mandiri; tombol kembali mempertahankan mapel. Pada viewport 390 × 844, materi tidak meluber horizontal; mode teks besar memakai 20 px. Tema terang/gelap diperiksa, viewport dan ukuran teks dipulihkan. Tidak ada console error pada alur hasil/rekap yang diperiksa.

Empat tes regresi awal gagal sebelum perbaikan: rekomendasi topik kosong, hasil bahasa, tampilan hasil lama, dan konteks input Groq. Mutation check dengan menonaktifkan sementara guard soal sulit membuat tiga tes gagal; setelah guard dipulihkan, 31 tes terkait lulus. Ini memastikan regresi menangkap perubahan perilaku, bukan sekadar mencerminkan implementasi.

Tinjauan kode independen menemukan sesi aktif lama yang masih dapat menyimpan soal sulit pada penguasaan rendah. `start` dan `quizView` kini menormalkan sesi tersebut; `answer` menolak sebelum menulis BKT. Dua regresi memeriksa jawaban/mastery lama tetap utuh. Pemeriksaan ulang reviewer menutup temuan tanpa P1/P2 lain.

Hash data demo proyek asli, rumus BKT, dependency/lockfile, dan migration dibandingkan dengan baseline sebelum audit: 8 berkas diperiksa dan tidak berubah. Tidak ada migration baru. Tes PostgreSQL lokal dan audit dependency tidak menggantikan pengujian Auth/email Supabase, Groq live, atau beban 30 siswa di hosting.

## Rilis dan pekerjaan sekolah

Branch peninjauan: `codex/fix-assessment-readiness-20261030`. `vercel.json` menonaktifkan deployment otomatis khusus branch ini; main tetap mengikuti pengaturan sebelumnya. Tidak ada merge/deploy atau perubahan database production dalam pekerjaan ini.

Penetapan guru, penyediaan kelas/bank online, pengaturan SMTP, validasi indikator CP/KD oleh guru mitra, kalibrasi instrumen dan pilot 30 siswa tetap memerlukan prosedur sekolah. Perbaikan kode tidak mengubah hasil audit menjadi klaim validitas ilmiah atau kesiapan kapasitas hosted.
