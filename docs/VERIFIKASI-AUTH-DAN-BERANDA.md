# Verifikasi registrasi dan beranda — 27 Oktober 2026

## Temuan pada layanan online

Log Authentication proyek Supabase yang dituju menunjukkan dua permintaan `/signup` berstatus 400 dengan pesan alamat email tidak valid. Handler lama mengganti semua kegagalan signup dengan pesan umum yang sama. Pemeriksaan ini tidak membuat akun, mengirim email pengujian, atau mengubah pengaturan Auth.

## Perubahan

- Kesalahan email dan kata sandi mendapat petunjuk pada kolom terkait; pembatasan pengiriman dan kegagalan layanan memiliki status tersendiri.
- Email dirapikan sebelum dikirim, isian tidak valid ditolak sebelum client Supabase dibuat, dan tambahan role pada payload tetap ditolak.
- Pendaftaran berhasil serta email yang sudah terdaftar memakai pesan netral yang sama. Sesi hanya dianggap tersedia jika Supabase benar-benar mengembalikan sesi.
- Log aplikasi berisi kode dan status, tanpa isian pengguna atau pesan provider mentah.
- Beranda publik menjelaskan tiga mapel, cara belajar, ruang guru, dan pertanyaan umum. Login/registrasi menggunakan tata letak dan bahasa baru dengan tema terang/gelap.
- Tidak ada perubahan skema database atau kebutuhan environment variable baru.

## Hasil pemeriksaan

- Unit/integrasi route dengan Supabase mock: 107 tes pada 9 berkas lulus.
- ESLint, TypeScript, dan build produksi Next.js lulus.
- Browser lokal memakai build produksi serta konfigurasi placeholder untuk proyek `.invalid`; tidak memakai kredensial sekolah.
- Beranda, navigasi ke registrasi/login, pergantian tema, validasi kolom, dan fokus ke kolom yang bermasalah diperiksa di browser.
- Lebar 390 dan 320 piksel diperiksa tanpa overflow horizontal; tampilan desktop diperiksa pada 1280 piksel.
- Tidak ada error/warning browser pada alur halaman publik yang diperiksa.

Keberhasilan pendaftaran dan email konfirmasi pada proyek hosted belum diuji dengan akun nyata. Pengguna perlu memakai email aktif. Untuk menerima pendaftaran siswa di luar anggota organisasi Supabase, pengelola perlu menyiapkan layanan pengiriman email sesuai dokumentasi Supabase; konfirmasi email tidak dinonaktifkan.
