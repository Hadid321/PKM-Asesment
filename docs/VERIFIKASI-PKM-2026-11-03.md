# Pemeriksaan kesiapan PKM — 3 November 2026

## Domain dan login

Domain utama yang terverifikasi pada proyek pkm-aja adalah `https://www.adaptiva-sman1pp.my.id`. Domain tanpa www mengalihkan 308, dan `pkm-aja.vercel.app` mengalihkan 301 ke domain utama.

Penyebab 403 terkonfirmasi menggunakan POST kosong tanpa kredensial: Origin domain baru mendapat 403 dengan pesan asal ditolak; Origin domain lama diteruskan ke validasi formulir dan mendapat 400. Nilai APP_URL produksi masih memakai alamat lama. Nilai ini sudah diubah melalui konektor hosting ke domain utama; berlaku untuk deployment berikutnya. Pemeriksaan Origin tetap exact-match; tidak menerima host/forwarded header atau wildcard sebagai jalan pintas.

Site URL dan allowlist tautan konfirmasi di pengaturan akun juga perlu mengikuti domain baru. Konektor akun tidak menyediakan perubahan konfigurasi Auth, dan browser panel pengelola belum login, sehingga pengaturan ini belum dapat diverifikasi/disimpan. Target: Site URL `https://www.adaptiva-sman1pp.my.id`, redirect `https://www.adaptiva-sman1pp.my.id/auth/confirm`. Gunakan template token_hash yang sudah tersedia; tidak perlu mengganti kata sandi atau membuat ulang akun siswa.

## Isi latihan dan penggunaan

- Mode demo lokal otomatis menyiapkan 72 soal orisinal yang sudah ada pada paket kelas XII (24 per mapel); pemuatan ulang memakai ID stabil dan fingerprint tanpa duplikasi. Terhubung hanya ke adapter demo, mempertahankan profil, peran, jawaban, dan penguasaan sebelumnya. Tidak mengubah rumus BKT atau Groq.
- Halaman panduan menampilkan tiga langkah sesuai peran, tautan tindakan, penjelasan hasil, dan bantuan sederhana. Profil, identitas sekolah, dan pesan gangguan menggunakan bahasa peserta; detail konfigurasi/layanan tidak ditampilkan dalam respons kegagalan server.
- Huruf dasar 18 px pada pengaturan peramban standar; tombol Aa menjadi 22 px. Ukuran tetap mengikuti pembesaran peramban. Tiga tautan beranda memakai smooth scroll dan animasi masuk halus, hanya jika pengguna tidak memilih pengurangan gerak.
- Bahan panitia terpisah: 72 soal dalam tiga CSV, naskah dan kunci lengkap, enam soal Peluang kejadian untuk topik lama, dan panduan demo. Seluruh CSV lolos validator impor. Kunci tidak ditempatkan pada folder publik atau endpoint siswa.

## Hasil pemeriksaan

Sumber uji adalah salinan persis `main` GitHub `7fceb04a5f2c6b8311f1c26cb386bc1a9fbfc7a1` dengan perubahan tugas ini. Salinan ini tidak membawa env/key atau data asli workspace.

- 151 tes pada 15 berkas lulus, termasuk penerimaan domain baru, penolakan domain lain/Origin kosong/host palsu, konfigurasi hosting tanpa APP_URL, penyamaran error server, serta seluruh materi, bank, algoritma, otorisasi, dan transaksi PostgreSQL lokal sebelumnya.
- Lint, TypeScript, dan build produksi Next.js 16.4.2 lulus. Audit dependency produksi melaporkan 0 advisori; tidak ada perubahan dependency atau migration.
- 29 pemeriksaan HTTP pada build akhir lulus: role injection, CSRF, isolasi pengguna, kunci tersembunyi, asesmen tiga mapel, idempotensi, impor CSV dan ekspor.
- Browser: dashboard siswa menampilkan bank Matematika 36 soal (24 paket + 12 topik lama wajib), Inggris 24, Indonesia 24. Ketiganya memiliki tombol latihan aktif tanpa impor manual sebelumnya. Satu sesi Bahasa Indonesia selesai 3/3, BKT 98%, rekomendasi Inferensi dan argumentasi; rekap guru menunjukkan data yang sama.
- Panduan siswa/guru, profil, tema, menu ponsel, dan Aa diperiksa. Viewport 390 × 844 tidak meluber horizontal pada panduan dengan huruf 18 maupun 22 px. Teks panduan yang dirender tidak mengandung nama database/provider. Tidak ada console error pada alur yang diperiksa.
- Ketiga tautan Mata pelajaran, Cara belajar, dan Untuk guru diuji dari awal halaman: hash tujuan benar, smooth scroll aktif, dan animasi section-arrival diterapkan. Preferensi pengurangan gerak mengecualikan aturan tersebut melalui media query.
- Tinjauan kode independen tidak menemukan P1/P2; sarannya memakai pageActor pada panduan diterapkan untuk menghindari pembacaan riwayat asesmen yang tidak diperlukan.

## Yang belum selesai secara online

Inspeksi baca-saja menemukan dua akun siswa terkonfirmasi, tanpa guru/kelas/keanggotaan/bank milik guru. Kedua akun tetap siswa sesuai keputusan pemilik. Tidak ada akun yang dipromosikan atau data production yang ditambahkan. Pemilik sedang menyiapkan akun guru terpisah; setelah identitas dan izinnya diberikan, kelas PKM serta bank dapat disiapkan. Soal seed tanpa pemilik tidak otomatis disajikan sebagai soal guru.

Deployment ditahan sesuai instruksi persetujuan terpisah. Perubahan domain belum membuktikan login nyata sampai deployment memakai APP_URL baru dan pemilik mencoba akun sendiri. Tidak ada pengujian login memakai kata sandi asli, pengiriman email baru, atau uji beban 30 siswa yang diklaim selesai. Pengaturan email serta peninjauan akademik oleh guru mitra tetap bagian persiapan kegiatan.

## Pembaruan setelah persetujuan deployment

Pemilik kemudian menyetujui deployment. Commit aplikasi `4ce1397dad2e2583eb012d6d7a8d013c5950b052` dirilis melalui deployment `dpl_E1uiyXqnYHFsLg7fwLoJPZSUPfZj`, berstatus READY pada proyek pkm-aja dan domain sekolah. Auto-deploy tetap ditahan; persetujuan ini dipakai untuk rilis manual tersebut.

Pemeriksaan setelah rilis: GET login 200 dengan identitas sekolah dan petunjuk memakai akun lama. POST login kosong dari Origin domain sekolah kini mencapai validasi formulir (400), sedangkan Origin domain lama/asing ditolak 403. Ini memverifikasi perbaikan mismatch domain tanpa mematikan perlindungan Origin. Alamat lama `/login` mengarah ke `https://www.adaptiva-sman1pp.my.id/login`. Browser produksi memverifikasi ukuran teks dasar 18 px dan tidak ada nama layanan database pada teks halaman. Konfirmasi login nyata masih menunggu pemilik mencoba akun sendiri.
