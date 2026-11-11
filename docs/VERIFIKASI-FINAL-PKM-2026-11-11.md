# Pemeriksaan akhir PKM — 11 November 2026

## Perubahan
- Daftar asesmen mengabaikan metadata administratif archived_at. Data soal, fingerprint, jawaban, dan hasil tetap tersimpan dan hasil milik peserta tetap dapat dibuka melalui URL pengerjaan.
- Arsip tidak membuka kembali penggunaan paket yang pernah dirilis. Tidak ada endpoint siswa/guru yang dapat menulis metadata arsip.
- Pengaturan Brevo dan email konfirmasi bermerek Adaptiva tercatat di BREVO-DNS-PKM.md. Tidak ada key di repositori.

## Verifikasi
- 197 tes dalam 21 berkas lulus, termasuk RLS/SQL, penjagaan fokus, akses peran, dialog, asisten, dan regresi arsip.
- Lint, pemeriksaan TypeScript, dan build Next.js lulus.
- Penghapusan sementara filter arsip menyebabkan tes baru gagal. Sumber dipulihkan dan 13 tes CBT lulus kembali.
- Review independen tidak menemukan blocker pada perubahan arsip.
- Browser lokal port 3015: siswa dapat masuk/dashboard; tombol status pengerjaan guru tidak ada pada daftar siswa. Akses langsung bank-soal, paket-soal, impor, rekap, dan topik mengarah ke halaman akses terbatas.
- Tiga belas asesmen sintetis lokal yang sudah ditutup diarsipkan. Salinan sebelumnya berada di folder kerja privat presentasi, bukan Git. Akun dan soal tetap utuh.
- Browser dan pemeriksaan visual perubahan dialog, fokus tiga catatan, izin guru, tema, mobile, serta fallback AI telah dilakukan pada verifikasi sebelumnya. Lihat VERIFIKASI-DIALOG-DAN-ASISTEN-2026-11-10.md dan dokumen fokus.

## Urutan aktivasi
Pengguna menyetujui migration fokus dan deployment setelah pengujian. Migration assessment_focus_guard telah diterapkan dan RPC baca diverifikasi. Tabel fokus mengaktifkan RLS dan tidak memberi hak SELECT kepada authenticated. Source baru wajib aktif sebelum menambahkan archived_at di production karena parser versi lama belum mengenali field itu.

Pengarsipan production hanya untuk asesmen Asesmen PKM yang disetujui, sudah closed/released. Gunakan transaksi dengan revision lock/increment, pertahankan seluruh payload selain archived_at, dan pastikan tepat satu baris berubah. Jangan menghapus fingerprint paket released.

## Batas pemeriksaan
Pengiriman email Brevo nyata dan konfirmasi sampai dashboard belum terverifikasi. Respons sukses provider Groq nyata belum terverifikasi pada sesi lokal (Groq dinonaktifkan untuk uji). Tidak ada uji beban 25/100 pengguna serentak. Jangan menyatakan aplikasi anti-mencontek mutlak atau kesiapan kapasitas berdasarkan jumlah tes.

Smoke script membuat dan menutup asesmen sintetis. Jalankan hanya pada salinan dataset terisolasi, bukan dataset presentasi atau production.
