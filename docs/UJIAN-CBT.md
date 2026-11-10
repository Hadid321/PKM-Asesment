# Asesmen Adaptiva

Revisi dan pemeriksaan: 10 November 2026. Fitur siap ditinjau; migration dan aktivasi situs sekolah menunggu persetujuan pemilik.

## Alur panitia dan peserta

1. Masuk sebagai guru. Siswa bergabung ke kelas melalui kode kelas.
2. Buka **Asesmen**, pilih kelas dan mapel. Tinjau 24 soal, kunci, dan kesesuaian dengan silabus. Durasi standar 45 menit; guru dapat mengatur 5–180 menit.
3. Centang persetujuan peninjauan dan buka ujian. Bagikan **kode ujian** saat peserta siap. Kode ini berbeda dari kode kelas.
4. Siswa membuka Asesmen dan memasukkan kode. Urutan soal dan pilihan diacak sekali per peserta. Refresh mempertahankan urutan, jawaban, dan tenggat.
5. Siswa memilih jawaban, menandai ragu-ragu, berpindah nomor, lalu mengumpulkan. Pastikan tulisan **Semua perubahan sudah tersimpan** muncul. Jika penyimpanan gagal, tetap di soal tersebut dan tekan **Coba simpan lagi**.
6. Guru memperbarui status pengerjaan untuk memantau peserta. Tekan **Akhiri ujian** setelah pelaksanaan selesai. Penutupan mengumpulkan pengerjaan aktif; guru diminta konfirmasi.
7. Tekan **Rilis hasil dan pembahasan**. Siswa menekan **Periksa hasil terbaru** untuk melihat nilai, pembahasan, dan estimasi BKT.

Untuk demonstrasi singkat, kerjakan beberapa nomor lalu kumpulkan. Nomor kosong bernilai salah; jelaskan bahwa nilai demonstrasi bukan nilai rapor.

## Soal dan cakupan kurikulum

- Bank latihan sekolah telah diisi 96 soal milik guru: seluruh 16 topik terisi. Soal lama dan riwayat tetap dipertahankan.
- Bank asesmen terpisah: 24 Matematika, 24 Bahasa Inggris, dan 24 Bahasa Indonesia. Soal disusun orisinal dan kuncinya berada di server.
- Matematika: transformasi fungsi, busur/juring, pencacahan, peluang. Inggris: membaca informasi, narasi, argumen, prosedur. Indonesia: informasi, argumen, kebahasaan, apresiasi sastra.
- Cakupan mendampingi K-13 dan CP Fase F, dengan batas yang dijelaskan pada [pemetaan kurikulum](KURIKULUM-KELAS-XII.md). Fase F mencakup XI–XII; guru perlu memastikan posisi materi sesuai ATP/silabus sekolah. Paket belum merupakan instrumen akhir semester lengkap atau alat ukur yang terkalibrasi.
- [Penjelasan resmi Kemendikdasmen, 23 Juni 2026](https://www.kemendikdasmen.go.id/siaran-pers/15636-capaian-pembelajaran-baru-telah-terbit-yang-berubah-hanya-mata-pelajaran-agama-dan-budi-pekerti) menyatakan CP tiga mapel ini tetap mengacu pada keputusan 046/H/KR/2025.
- Paket bawaan dapat digunakan serentak pada beberapa kelas sebelum rilis. Seluruh ujian dengan butir sama harus ditutup sebelum kunci dirilis. Setelah kunci pernah dirilis, butir tersebut tidak dapat dipakai lagi sebagai ujian rahasia.
- Gelombang berikutnya memakai CSV privat berisi tepat 24 soal baru dengan format bank soal. CSV asesmen tidak diimpor ke bank latihan. Pemeriksaan mengabaikan huruf pilihan dan kapitalisasi untuk mendeteksi duplikasi; perubahan parafrasa tetap memerlukan peninjauan manusia.

## Pengamanan dan batas

Kunci, pembahasan, skor, dan estimasi BKT siswa ditahan sampai pengerjaan dikumpulkan dan guru merilis hasil. Token siswa tidak dapat membaca tabel privat atau memanggil RPC CBT. Pengunggah harus guru pemilik kelas. Pemeriksaan global mencegah soal latihan digunakan dalam CBT serta mencegah soal ujian yang belum dirilis masuk ke bank latihan, termasuk setelah ujian ditutup.

Tenggat dan penilaian mengikuti server. Satu siswa memiliki satu pengerjaan per ujian dan satu pengerjaan aktif secara keseluruhan. Penyimpanan memakai versi untuk mencegah tab atau respons lama menimpa jawaban baru. Saat luring, jawaban yang belum tersimpan perlu dicoba lagi sebelum waktu habis; aplikasi tidak menjanjikan pengiriman setelah tenggat.

Pengacakan dan penahanan kunci mengurangi peluang berbagi jawaban. Aplikasi web tidak dapat menjamin peserta tidak memakai perangkat kedua atau berkomunikasi. Pengawasan ruang, jarak duduk, dan aturan perangkat tetap diperlukan. Layar penuh bersifat bantuan fokus; tidak ada rekaman kamera atau hukuman otomatis karena pindah tab.

BKT memakai fungsi pembaruan yang sama dengan latihan dan prior pada saat mulai. Hasil asesmen disimpan terpisah; tidak mengubah mastery atau riwayat latihan. Butir kosong tidak dianggap bukti BKT. Nilai benar dan estimasi BKT adalah ukuran berbeda.

## Aktivasi pengelola

Setelah persetujuan: terapkan migration `20261103121424_private_cbt_exams.sql` satu kali, atur `CBT_ENABLED=true` di environment production proyek pkm-aja, lalu deploy commit yang diuji. Migration menambah tabel/RPC privat, indeks, dan trigger perlindungan soal; tidak menghapus atau mengulang seed. Flag default mati pada production. Latihan, Groq, dan data lama tetap dapat dipakai saat flag mati. Jika perlu menonaktifkan CBT, matikan flag dan deploy ulang; data ujian disimpan.

## Verifikasi

- 177 pengujian otomatis pada 19 berkas: engine ujian, mapping pilihan acak, batas waktu server, kepemilikan, DTO privat, rilis lintas kelas, CSV, respons tidak berurutan, serta migration PostgreSQL melalui PGlite.
- Uji mutasi: menghapus syarat rilis guru membuat dua tes kebocoran kunci gagal. Kondisi asli dipulihkan.
- Delapan pemeriksaan HTTP lokal: autentikasi, CSRF, preview, publish, kode, autosave/refresh, versi, submit, close/release, penolakan paket yang sudah terbuka.
- Build production, lint, pemeriksaan TypeScript dan audit dependensi production lulus; tidak ada dependensi baru.
- Pengujian browser lokal meliputi peran guru/siswa, pratinjau 24 soal, CSV privat, kode, autosave, ragu-ragu, refresh, navigasi nomor, pengumpulan, hasil tertahan, penutupan/rilis, tema dan teks besar serta layar ponsel.

Pengujian ini belum membuktikan beban serentak 30 perangkat pada jaringan sekolah. Lakukan gladi bersih dengan perangkat dan jaringan lokasi sebelum hari pelaksanaan.

## Pemantauan dan pendamping belajar

Aktivitas asesmen mencatat tab tersembunyi, fokus jendela, navigasi keluar halaman, keluar layar penuh, dan laporan koneksi. Guru menerima pembaruan sekitar setiap lima belas detik; heartbeat perangkat sekitar setiap dua puluh detik. Waktu riwayat adalah penerimaan server. Catatan dapat tertunda atau tidak terkirim saat jaringan putus dan tidak membuktikan kecurangan. Tidak ada kamera, isi tab lain, atau tombol yang ditekan yang direkam. Tidak ada hukuman otomatis. Guru perlu mengonfirmasi konteks bersama siswa.

Tindak lanjut siswa tersedia setelah rilis; tindak lanjut kelas setelah asesmen ditutup. Groq hanya menerima agregat hasil per topik, key netral dan nama katalog; tidak menerima nama, email, slug kustom, isi soal, jawaban mentah atau aktivitas perangkat. Nilai/BKT/urutan prioritas dihitung sistem. Hasil disimpan privat dengan klaim tunggal, timeout dan panduan cadangan saat layanan tidak tersedia.

Tambahan migration `20261110063036_assessment_activity_and_learning_briefs.sql` diterapkan setelah migration asesmen privat. Hanya server yang dapat mengakses penyimpanan aktivitas dan rangkuman. Pengujian mencakup akses ulang cache, pergantian lease, event ulang, serta tujuh pemeriksaan HTTP pendamping asesmen.

## Email Adaptiva

Template konfirmasi sudah memakai identitas Adaptiva. Pengiriman bawaan Auth belum dapat memakai nama/alamat pengirim milik sekolah. Pengirim sendiri memerlukan custom SMTP dengan domain terverifikasi. Layanan bawaan memiliki pembatasan penerima/kuota dan tidak cocok untuk pendaftaran massal saat PKM. [Panduan resmi SMTP](https://supabase.com/docs/guides/auth/auth-smtp). Konfirmasi email tetap diaktifkan.
