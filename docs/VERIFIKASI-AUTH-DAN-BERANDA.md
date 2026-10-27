# Verifikasi registrasi dan beranda — 27 Oktober 2026

## Temuan pada layanan online

Log Authentication proyek Supabase yang dituju menunjukkan dua permintaan `/signup` berstatus 400 dengan pesan alamat email tidak valid. Handler lama mengganti semua kegagalan signup dengan pesan umum yang sama. Pemeriksaan ini tidak membuat akun, mengirim email pengujian, atau mengubah pengaturan Auth.

## Perubahan

- Kesalahan email dan kata sandi mendapat petunjuk pada kolom terkait; pembatasan pengiriman dan kegagalan layanan memiliki status tersendiri.
- Email dirapikan sebelum dikirim, isian tidak valid ditolak sebelum client Supabase dibuat, dan tambahan role pada payload tetap ditolak.
- Pendaftaran berhasil serta email yang sudah terdaftar memakai pesan netral yang sama. Sesi hanya dianggap tersedia jika Supabase benar-benar mengembalikan sesi.
- Log aplikasi berisi kode dan status, tanpa isian pengguna atau pesan provider mentah.
- Beranda publik menjelaskan tiga mapel, cara belajar, ruang guru, dan pertanyaan umum. Login/registrasi menggunakan tata letak dan bahasa baru dengan tema terang/gelap.
- Pembaruan awal formulir/beranda tidak menambah environment variable. Pembaruan produksi berikutnya dijelaskan di bawah.

## Hasil pemeriksaan

- Unit/integrasi route, domain, dan PostgreSQL lokal: 121 tes pada 10 berkas lulus setelah pembaruan produksi.
- ESLint, TypeScript, dan build produksi Next.js lulus.
- Browser lokal memakai build produksi serta konfigurasi placeholder untuk proyek `.invalid`; tidak memakai kredensial sekolah.
- Beranda, navigasi ke registrasi/login, pergantian tema, validasi kolom, dan fokus ke kolom yang bermasalah diperiksa di browser.
- Lebar 390 dan 320 piksel diperiksa tanpa overflow horizontal; tampilan desktop diperiksa pada 1280 piksel.
- Tidak ada error/warning browser pada alur halaman publik yang diperiksa.

Keberhasilan pendaftaran dan email konfirmasi pada proyek hosted belum diuji dengan akun nyata. Pengguna perlu memakai email aktif. Untuk menerima pendaftaran siswa di luar anggota organisasi Supabase, pengelola perlu menyiapkan layanan pengiriman email sesuai dokumentasi Supabase; konfirmasi email tidak dinonaktifkan.

## Pembaruan produksi

- Log Vercel menunjukkan kegagalan RPC pembacaan dashboard; slot key server belum pernah diperbarui. Pengguna kemudian mengisi key melalui Vercel dan melakukan redeploy, yang terverifikasi berstatus READY. Nilai key tidak dibaca.
- Migration bank guru dan tiga mapel wajib yang sebelumnya belum ada telah diterapkan. Query sebagai `service_role` berhasil membaca snapshot profil beserta 16 topik; akun dan riwayat tidak dihapus.
- Izin fungsi event trigger `rls_auto_enable()` dicabut dari PUBLIC/anon/authenticated melalui migration tambahan. Verifikasi menunjukkan pemilik tetap memiliki EXECUTE, event trigger tetap aktif, seluruh tabel public memakai RLS, dan RPC administratif hanya dapat diakses service_role. Dua warning advisor mengenai fungsi tersebut sudah hilang. Informasi RLS tanpa policy pada tabel private app_revision dipertahankan karena tabel memang tertutup untuk client; warning leaked password protection masih ada.
- Panel beranda/dashboard dan elemen pendukung memakai token tema; warna hardcoded yang mempertahankan panel gelap telah diganti. Preferensi ikut navigasi dan perubahan antar-tab; preferensi sistem dipakai bila belum ada pilihan tersimpan. Halaman error menyediakan tombol tema dan pesan untuk pengguna sekolah.
- Signup mengirim tujuan konfirmasi dari APP_URL. Callback menerima token hash email atau kode PKCE, menetapkan tujuan tetap, no-store, dan no-referrer. Test mencakup parameter tidak valid, kode gagal, serta penolakan redirect bebas. Pengguna melaporkan Site URL, allowlist, dan template telah disimpan; konektor tidak dapat membaca balik konfigurasi Auth tersebut.
- Limiter aplikasi tidak lagi menolak siswa ke-26 pada jaringan yang sama. Tes 30 request memakai provider mock, dan tes 30 profil memakai PostgreSQL lokal; keduanya bukan uji beban/pengiriman email produksi.
- Verifikasi visual di atas dilakukan sebelum perubahan token panel terakhir. Kontrol browser pada sesi lanjutan dihentikan karena URL tab tidak dapat diverifikasi; tidak ada klaim pemeriksaan visual baru setelah penghentian itu.

Lihat [konfigurasi produksi dan batas layanan](PRODUKSI-PKM.md) untuk pengaturan email dan persiapan uji kelas.
