# Verifikasi aturan fokus dan peringkat — 10 November 2026

## Hasil yang selesai

- 193 tes unik pada 20 berkas lulus; fixture bersama tidak mengimpor ulang suite tes.
- 6 skenario HTTP fokus lulus: persetujuan, peringatan, penghentian ketiga, blokir jawaban/submit, izin guru idempotent, peringkat setelah rilis.
- 8 skenario HTTP asesmen dan 7 skenario HTTP pendampingan lulus. Skrip asesmen memakai CSV simulasi unik supaya aman diulang; paket yang sudah dirilis tetap ditolak.
- Lint, pemeriksaan TypeScript, dan build production Next.js lulus.
- Tes SQL mencakup 101 peserta, nilai seri, pseudonim unik, akses lintas akun, ACL/RLS, penolakan commit jawaban yang datang terlambat, deadline, dan penutupan guru.
- Eksperimen mutasi batas ketiga menjadi keempat membuat tes gagal sebagaimana mestinya; kondisi asli dipulihkan.
- Review independen kode menyelesaikan masalah handoff tab, grace saat timer ditunda, countdown, dan alias peserta di atas 99.
- Browser lokal: guru meninjau paket Bahasa Indonesia, membuka asesmen dengan aturan fokus, siswa menyetujui aturan, memulai dan menyimpan satu jawaban. Paket memakai materi asesmen kelas XII yang sudah tersedia dan ditinjau sebelumnya.

## Pengujian Chrome lanjutan

Pada sesi lanjutan setelah pengguna membuka demo di Chrome, alur nyata berhasil diperiksa:

- Guru membuka asesmen Bahasa Indonesia dengan aturan fokus aktif.
- Siswa menyetujui aturan dan menyimpan satu jawaban.
- Berpindah ke tab lain selama lebih dari tiga detik lalu kembali menghasilkan peringatan 1/3 dan 2/3.
- Perpindahan ketiga menampilkan penghentian 3/3, menyembunyikan soal, dan mempertahankan satu jawaban. Waktu terus berkurang.
- Layar penghentian terbaca pada tema gelap dan terang. Bukti lokal tersimpan di focus-20261110/chrome-third-strike.png.
- Berdasarkan tampilan Chrome, posisi checkbox persetujuan dan ragu-ragu dirapikan menjadi sejajar dengan teks; perubahan CSS ditinjau independen dan build diperiksa kembali.

## Verifikasi izin guru dan layar ponsel

Pada sesi pengujian berikutnya, dua pemeriksaan yang sebelumnya tertunda berhasil:

- Guru di Chrome melihat status Dihentikan sementara, jawaban 1/24, pelanggaran saat ini 3/3 dan total riwayat tiga.
- Guru mengisi alasan pemeriksaan pengawas lalu menekan Beri izin lanjut. Status berubah menjadi Mengerjakan, pelanggaran saat ini 0/3 dan total riwayat tetap tiga. Form izin tidak lagi ditampilkan setelah berhasil.
- Siswa membuka Lanjutkan ujian pada viewport 390 × 844. Soal dan jawaban D sebelumnya tetap tampil; waktu tersisa terus berkurang dan tidak kembali ke 45 menit.
- Tanda ragu-ragu berhasil diaktifkan dan tersimpan. Label checkbox sejajar dengan teks setelah perbaikan CSS.
- Pengujian memakai preferensi teks besar. Lebar dokumen 375 piksel pada viewport 390 piksel, sehingga tidak ada luapan horizontal halaman.
- Peringkat dengan identitas Anda tersedia pada daftar hasil yang sudah dirilis; perhitungan, privasi, dan syarat rilis telah diuji melalui API/database.

Bukti lokal: focus-20261110/chrome-teacher-resumed.png dan focus-20261110/mobile-resumed-controls.png.

Sesi browser kemudian dihentikan oleh pemeriksaan izin otomatis saat konfirmasi penutupan ujian demo muncul, karena URL Chrome tidak dapat dipastikan. Tidak ada input browser setelah penghentian. Klik konfirmasi penutupan dan rilis untuk sesi ini belum selesai melalui UI; alurnya sudah lulus pengujian API/database.

## Sebelum aktivasi

1. Jalankan demo lokal (APP_MODE=demo, CBT_ENABLED=true, GROQ_ENABLED=false; tanpa akun production).
2. Guru membuka asesmen baru dengan aturan fokus aktif; siswa menyetujui aturan dan menjawab satu soal.
3. Di Chrome, tinggalkan tab selama lebih dari dua detik lalu kembali; ulangi tiga kali. Periksa peringatan 1/3 dan 2/3, lalu penghentian 3/3, jawaban tetap tersimpan, waktu tidak diulang.
4. Guru memasukkan alasan dan memberi izin lanjut. Siswa dapat melanjutkan, total riwayat tetap tiga dan deadline tetap sama.
5. Kumpulkan, tutup dan rilis hasil; siswa melihat peringkat dengan pseudonim. Periksa juga tema gelap/terang dan layar ponsel.
6. Source sudah di-push ke main sesuai instruksi pengguna. UI izin guru dan kontrol ponsel sudah diuji. Sebelum aktivasi production, minta persetujuan migration dan deployment; batas verifikasi dialog penutupan dicatat di atas. Migration baru menambah kontrol fokus dan audit izin; tidak menghapus data atau mengubah nilai latihan/BKT.

Belum ada migration atau deployment production untuk fitur baru ini. AI dan pencatatan aktivitas pada release sebelumnya tetap berlaku.
