# Verifikasi kontrol peran, dialog, dan Asisten Adaptiva

Tanggal: 10 November 2026 (Asia/Jakarta). Pemeriksaan memakai server demo lokal, tanpa akun, key, atau data production.

## Perubahan
- Tombol Perbarui status pengerjaan hanya ditampilkan untuk guru. Daftar siswa memperbarui status otomatis setiap 15 detik saat halaman terlihat.
- Konfirmasi mengakhiri, merilis, dan mengumpulkan asesmen memakai dialog dalam aplikasi. Judul asesmen, konsekuensi, Batal dan tindakan konfirmasi ditampilkan jelas. Dialog mengikuti tema dan preferensi teks besar.
- Panel Asisten belajar Adaptiva ditonjolkan di hasil siswa sesudah rilis dan pada tindak lanjut guru setelah penutupan. Tombol utama mengajak menyusun rencana atau arahan kelas. Fallback diberi label panduan terstruktur agar tidak mengaku sebagai hasil AI.
- Panduan SMTP menambahkan Brevo sebagai utama dan SMTP2GO sebagai cadangan manual. SMTP tidak mengganti layanan Auth atau melewati pembatasan endpoint.

## Pemeriksaan
- 196 tes pada 21 berkas lulus; termasuk tiga regresi SSR untuk peran guru/siswa dan ketersediaan asisten sesudah rilis.
- Lint, TypeScript, dan build production lulus. Audit dependency production: nol kerentanan yang dilaporkan registry npm.
- Eksperimen membalik kondisi tombol guru menyebabkan dua regresi gagal; kondisi asli dipulihkan sebelum verifikasi akhir.
- Review independen menyetujui fokus, pembatalan, pemulihan fokus, error async, polling, pembatasan peran dan akses AI.
- Browser: fokus awal dialog berada pada Batal; Escape membatalkan; Batal memulihkan fokus ke pemicu. Dialog penutupan diuji pada 390 × 844 dengan teks besar.
- Browser siswa: tombol pemantauan guru tidak ditemukan dan asisten tidak muncul selama pengerjaan. Siswa memilih satu jawaban, membatalkan pengumpulan, lalu mengonfirmasi pengumpulan.
- Browser guru: asesmen demo ditutup dan hasil dirilis melalui dialog baru.
- Browser siswa: hasil dirilis tersedia, panel asisten tampil sebelum rincian BKT, dan rencana belajar dapat dibuka. GROQ_ENABLED=false pada demo sehingga jalur fallback diuji; ini tidak menjadi bukti panggilan provider Groq di production.
- Lebar 320, 768, 1024, dan 1440 diuji tanpa luapan horizontal halaman. Tidak ada error konsol pada pemeriksaan akhir. Ukuran browser dipulihkan.

Bukti lokal: focus-20261110/new-confirmation-mobile.png dan focus-20261110/new-ai-assistant-panel.png.

Tidak ada migration, pengaturan SMTP, atau deployment production yang dilakukan untuk perubahan UI ini. Aktivasi sekolah masih membutuhkan migration fokus yang telah disiapkan dan persetujuan deployment.
