# Pembaruan untuk mitra SMA

Konteks produk adalah **program pengabdian kepada masyarakat dengan mitra sekolah SMA**. Tampilan memakai tema terang/gelap monokrom, navigasi berdasarkan peran, dan label yang berfokus pada asesmen serta pekerjaan guru. Pilihan tema disimpan di browser; pada kunjungan pertama mengikuti preferensi perangkat.

## Jika assessment_core.sql dan seed.sql sudah dijalankan

**Tidak perlu menjalankan ulang atau menghapus keduanya.** Buka SQL Editor pada proyek yang sama, lalu tinjau dan jalankan migration lanjutan yang belum terpasang secara berurutan:

`supabase/migrations/20261023123926_teacher_managed_question_bank.sql`

`supabase/migrations/20261027034148_required_subjects_grade12.sql`

Pembaruan 27 Oktober menambah tiga mapel wajib, 12 topik, metadata kategori, dan penjagaan prasyarat per mapel. Paket 72 soal ditinjau serta diimpor dari akun guru setelah aplikasi dikonfigurasi. Limit, turunan, dan integral lama menjadi pengayaan; riwayat tetap tersimpan. Lihat [pemetaan kurikulum dan alur paket](KURIKULUM-KELAS-XII.md).

Migration lanjutan ini:

1. Membatasi bank soal guru ke soal miliknya sendiri.
2. Membatasi soal siswa ke guru yang memiliki kelas yang diikuti siswa itu.
3. Menolak penerbitan soal aktif jika soal tidak berasal dari guru kelas siswa, melalui trigger database.
4. Mempertahankan seluruh soal seed, akun, jawaban, estimasi BKT, dan riwayat. Soal seed yang tidak memiliki `created_by` guru tidak otomatis tersedia sebagai latihan.

Setelah pembaruan, bank soal sekolah bisa terlihat kosong meskipun `seed.sql` pernah dijalankan. Ini memang perilaku yang diinginkan: guru membuat soal melalui editor atau mengunggah CSV miliknya sendiri. Aplikasi tidak membuat soal dari LLM dan tidak mengambil soal contoh lokal ketika mode Supabase dipilih.

Migration lama `20261023104730_assessment_core.sql` dan `supabase/seed.sql` tidak diubah pada revisi ini. Proyek baru menerapkan ketiga migration berdasarkan urutan nama berkas. Seed bersifat konten pengembangan opsional, bukan syarat latihan sekolah.

## Akun guru

`supabase/admin-promote-teacher.sql` adalah prosedur administratif untuk memberi peran guru pada akun Auth yang sudah ada. Berkas itu **bukan migration struktur** dan tidak dijalankan otomatis. Pembuatan akun publik tetap menghasilkan siswa. Pengelola dapat mempertimbangkan dan menjalankannya ketika akun guru pertama siap, sesuai README. Tidak ada tombol atau endpoint publik untuk mengangkat akun menjadi guru.

## Alur penggunaan sekolah

1. Pengelola menyiapkan akun guru melalui prosedur administratif.
2. Guru membuat kelas dan membagikan kode kepada siswa yang sesuai.
3. Guru menyiapkan topik, mengisi soal lewat editor atau membuka **Unggah soal**.
4. CSV mengikuti kolom pada template. Isi soal, opsi, kunci, kesulitan, dan pembahasan ditentukan guru. Maksimal 500 KB/200 baris; seluruh file divalidasi sebelum disimpan dan duplikat dilaporkan.
5. Siswa bergabung ke kelas dan memilih latihan yang sudah memiliki soal dari gurunya. Jika kelas atau soal belum tersedia, UI menampilkan keadaan tersebut secara jelas.
6. Jawaban diperiksa di server. Kunci dan pembahasan baru dikirim untuk jawaban milik siswa yang sudah tersimpan.

Sesi aktif lama yang menggunakan soal tanpa guru ditutup saat dilanjutkan, agar tidak macet. Jawaban dan BKT yang sudah ada dipertahankan. Tidak ada perhitungan ulang atau penghapusan riwayat secara diam-diam.

## Keamanan yang diuji secara lokal

Pemeriksaan peran dilakukan di server untuk editor, pratinjau CSV, dan commit impor. Identitas pembuat soal diisi server dari sesi guru. Client tidak memiliki izin INSERT langsung ke tabel questions, attempts atau mastery. RLS, grant, RPC administratif dan trigger menjaga batas akses database. CSV diperlakukan sebagai teks; tidak ada eksekusi file atau penyimpanan file publik.

Tes tambahan mencakup unggahan siswa ditolak, CSV campuran invalid dibatalkan, duplikasi impor, isolasi bank guru lain, siswa tanpa kelas, soal seed yang tetap tersimpan tetapi tidak diterbitkan, dan penutupan sesi lama tanpa mengubah riwayat. Migration diuji menggunakan PostgreSQL lokal PGlite setelah skema lama terpasang. Koneksi serta konfigurasi proyek Supabase milik pengguna tetap perlu diverifikasi dengan kredensial yang benar; pembaruan ini tidak menerapkan SQL ke proyek eksternal otomatis.
