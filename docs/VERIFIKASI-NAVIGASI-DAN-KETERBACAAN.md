# Navigasi mapel dan keterbacaan — 27 Oktober 2026

## Masalah dan hasil perubahan

Sebelumnya setiap pilihan mapel menggunakan navigasi server. Server memverifikasi pengguna/profil dan membaca snapshot database sebelum mengganti konten. Teks pendukung banyak berukuran 8–12 px. Deployment sebelumnya memakai region fungsi iad1, sedangkan database proyek berada di ap-south-1.

Ringkasan, latihan, rekomendasi, rekap, dan paket guru sekarang mengganti mapel dari data yang telah dimuat untuk pengguna tersebut. Native History API mengikuti integrasi resmi Next.js: URL, tautan langsung, kembali/maju, serta useSearchParams tetap sinkron tanpa meminta halaman baru hanya untuk filter mapel. Tautan sidebar mempertahankan mapel. Tombol Perbarui data tersedia untuk mengambil kondisi server terbaru; mutasi/penilaian tetap diverifikasi server. Tidak ada cache global data siswa. React cache pada pembacaan halaman hanya berlaku dalam satu request server dan menghilangkan pembacaan snapshot ganda pada bank soal.

DTO siswa tetap tidak memuat bank soal, kunci soal yang belum dikerjakan, atau siswa dari kelas lain. Paket lengkap diteruskan hanya setelah pemeriksaan peran guru di server, bukan dimasukkan sebagai konten statis JavaScript untuk semua pengunjung. Uji membandingkan hasil pemilahan lokal dengan hasil perhitungan server untuk siswa dan guru pada ketiga mapel, termasuk sesi aktif serta topik lama.

Font menggunakan rem, dengan dasar 16 px mengikuti pengaturan browser; teks pendukung minimal 14–15 px. Tombol Aa menaikkan ukuran dasar ke 20 px dan menyimpan preferensi lintas halaman/tab. Kontras teks sekunder dinaikkan; kontrol penting memiliki target minimal 44 px. Layout menyesuaikan pembesaran, dan tabel data tetap dapat digulir di dalam kontainernya. Ringkasan pertanyaan panjang dibuat singkat, dengan teks utuh tersedia saat detail dibuka.

Animasi masuk konten berlangsung 180–220 ms, animasi beranda 400 ms, serta transisi kontrol memberi umpan balik saat digunakan. Tidak ada delay buatan pada pemuatan. Semua animasi/transisi dinonaktifkan melalui prefers-reduced-motion. Konfigurasi vercel.json menempatkan fungsi pada bom1, sesuai region Mumbai database; file statis tetap dilayani CDN.

## Bukti pemeriksaan

- 126 tes pada 11 berkas lulus; ESLint, TypeScript dan build Next.js produksi lulus.
- Tes 30 pergantian mapel hanya memanggil repository sekali untuk pengambilan awal. Ini pemeriksaan jumlah pembacaan, bukan angka benchmark latensi jaringan.
- Browser memakai build produksi lokal dengan akun demo, tanpa kredensial sekolah. Ringkasan, latihan, rekomendasi, rekap guru, dan paket guru diperiksa; isi, statistik, dan tautan mengikuti mapel.
- Kembali melalui history, reload tautan mapel, perpindahan ke halaman latihan dengan mapel yang sama, dan tombol Perbarui data diperiksa.
- Ukuran computed body terverifikasi 16 px pada standar dan 20 px pada pilihan besar. Tema terang dan gelap diperiksa. Layar 1280, 390, serta 320 px diperiksa tanpa overflow horizontal halaman; tabel rekap memiliki scroll internal sesuai kebutuhan kolom.
- Tidak ada error/warning browser pada alur yang diperiksa. Pemeriksaan 56 file JavaScript browser tidak menemukan teks contoh unik dari paket soal server. Pemeriksaan ini melengkapi penjagaan modul server-only dan peran guru, bukan membuktikan semua kemungkinan kebocoran.
- Aturan prefers-reduced-motion diperiksa pada CSS; pengaturan sistem operasi tidak diubah. Tidak ada klaim audit WCAG menyeluruh atau benchmark Supabase produksi.

Pemuatan awal tetap membutuhkan autentikasi serta layanan database. Latensi produksi bergantung koneksi, cold start dan ukuran riwayat. Pemilahan lokal mengurangi perjalanan server saat mengganti mapel; data terbaru diambil saat memasuki halaman, melakukan mutasi/refresh, atau menekan Perbarui data.
