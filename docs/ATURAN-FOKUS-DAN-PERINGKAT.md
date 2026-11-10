# Aturan fokus dan peringkat Adaptiva

Status: implementasi baru perlu migration 20261110112854_assessment_focus_guard.sql dan deployment yang disetujui. Jangan menganggap fitur ini aktif hanya karena source sudah masuk main.

## Alur siswa dan guru

- Guru memilih aturan fokus saat membuka asesmen baru (aktif secara default pada formulir). Ujian lama tetap mengikuti aturan awalnya.
- Siswa membaca dan menyetujui aturan sebelum mulai.
- Meninggalkan tab terkonfirmasi lebih dari dua detik, atau keluar dari halaman asesmen, dihitung sekali per kejadian. Kehilangan fokus jendela, koneksi putus, dan keluar layar penuh dicatat tanpa langsung menambah pelanggaran.
- Pada pelanggaran ketiga, jawaban tidak dapat diubah atau dikumpulkan manual. Layar menjelaskan alasannya; jawaban tersimpan dan waktu tetap berjalan. Akun tidak dikeluarkan dari sekolah.
- Guru meninjau kejadian, memasukkan alasan, lalu memberi izin lanjut. Hitungan saat ini kembali nol; total riwayat dan alasan guru tersimpan. Waktu tidak ditambah. Ujian yang sudah berakhir tidak bisa diaktifkan kembali.
- Saat waktu habis atau guru menutup asesmen, jawaban yang tersimpan dikumpulkan meskipun pengerjaan sedang dihentikan.
- Peringkat membandingkan jumlah jawaban benar dalam asesmen yang sama. Seri memakai 1,2,2,4; kecepatan dan BKT tidak menjadi penentu. Siswa melihat peringkat setelah mengumpulkan dan guru merilis hasil, dengan nama peserta lain disamarkan. Guru melihat nama peserta kelasnya.

## Batas pengawasan

Catatan berasal dari browser: dapat terlambat ketika perangkat offline atau browser membekukan tab, dan dapat dimanipulasi pengguna yang mematikan JavaScript. Aplikasi tidak merekam isi tab lain, kamera, atau perangkat kedua. Gunakan pengawasan ruang dan pemeriksaan guru. Catatan bukan bukti otomatis mencontek, dan tidak mengubah nilai menjadi nol.

AI Groq memberi tindak lanjut belajar berdasarkan agregat topik setelah hasil dibuka. AI tidak memutuskan pelanggaran, peringkat, nilai, atau perubahan BKT.
