# Paket kelas XII — pembaruan 30 Oktober 2026

Tiga mapel wajib dalam aplikasi adalah **Matematika, Bahasa Inggris, dan Bahasa Indonesia**. Paket awal memuat **72 soal orisinal: 24 per mapel, 12 topik, 6 soal per topik**. Setiap topik memiliki dua soal mudah, dua sedang, dan dua sulit. Label kesulitan merupakan perkiraan desain, belum hasil kalibrasi pada siswa mitra.

Versi paket saat ini `kelas12-2026-10-30`. Stimulus Inggris diperpanjang menjadi 263–273 kata dengan beberapa paragraf; jadwal bus/perpustakaan pada ING-02 diperjelas. Opsi disusun ulang secara deterministik dengan enam kunci A/B/C/D per mapel; arti jawaban benar dipertahankan. Distraktor IND-16 diperbaiki agar menguji pemborosan kata dan perubahan makna, bukan sekadar susunan kata yang tidak masuk akal.

Perubahan paket berlaku untuk peninjauan dan impor baru. Soal, jawaban, dan nilai yang sudah tersimpan tidak ditulis ulang. Guru perlu meninjau bank yang sudah pernah diimpor sebelum menambahkan versi baru; pemeriksaan duplikat menggunakan isi soal/opsi sehingga revisi dapat menjadi butir baru, bukan pengganti otomatis.

## K-13 dan Kurikulum Merdeka

Mitra menggunakan keduanya. Paket merupakan bahan pendukung, bukan seluruh instrumen kelas XII yang telah divalidasi. CP Fase F mencakup XI–XII; posisi kelas dan semester perlu disepakati sesuai ATP/silabus sekolah. Pembaruan CP Juni 2026 hanya mengubah Agama dan Budi Pekerti; tiga mapel ini masih merujuk CP 046/2025. [Penjelasan resmi](https://www.kemendikdasmen.go.id/siaran-pers/15636-capaian-pembelajaran-baru-telah-terbit-yang-berubah-hanya-mata-pelajaran-agama-dan-budi-pekerti).

| Mapel      | Keterkaitan paket dengan pembelajaran                                                                                                     | Batas yang harus dilengkapi guru                                                                                                                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Matematika | Pencacahan dan peluang mendampingi K-13 XII; transformasi fungsi dan busur/juring mendampingi CP Fase F atau materi prasyarat sesuai ATP. | Statistika tabel distribusi frekuensi/histogram dan keseluruhan indikator kelas XII belum tercakup. [Modul K-13 XII KD 3.2](https://repositori.kemendikdasmen.go.id/21944/1/XII_Matematika-Umum_KD-3.2_Final.pdf).                           |
| Inggris    | Pemahaman tekstual, inferensi, evaluasi, serta prosedur. Stimulus lebih panjang memberi kesempatan membaca beberapa paragraf.             | Tidak menggantikan penilaian surat lamaran pekerjaan atau keterampilan produktif. Panjang teks saja tidak membuktikan level CEFR. [Modul K-13 XII](https://repositori.kemendikdasmen.go.id/22081/1/XII_Bahasa-Inggris_KD-3.2_4.2_Final.pdf). |
| Indonesia  | Informasi, argumen, kebahasaan dan apresiasi teks sastra.                                                                                 | Indikator genre khusus serta menulis/presentasi perlu asesmen lain. Latihan argumen tidak otomatis menilai seluruh struktur editorial. [Modul editorial XII](https://repositori.kemendikdasmen.go.id/21961/).                                |

Halaman paket guru menampilkan cakupan ini sebelum impor. Pengesahan indikator per butir dan kecukupan bank tetap dilakukan guru mitra. Tidak ada klaim bahwa satu paket berlaku sebagai ujian lengkap untuk dua kurikulum.

## Materi pendamping per topik

Setiap dari 12 topik paket kini memiliki halaman `/materi/<slug>` dengan penjelasan, contoh bertahap, dan latihan mandiri yang berbeda dari soal asesmen. Tautan kisi-kisi umum lama atau URL kosong mendapatkan fallback tampilan ke materi lokal. Tautan khusus yang disimpan guru tetap dipakai. Penyesuaian tampilan tersebut tidak memerlukan migration atau penulisan ulang data production.

## Acuan yang diperiksa

- [Keputusan Kepala BSKAP 046/H/KR/2025 — CP](https://kurikulum.kemendikdasmen.go.id/file/1753929861_manage_file.pdf). Dokumen resmi diunduh dan teksnya diperiksa. Matematika Fase F meliputi fungsi dan transformasinya, lingkaran, analisis asosiasi data, serta peluang dengan permutasi/kombinasi. Fase F mencakup XI–XII; pembagian materi per kelas mengikuti ATP sekolah.
- [Panduan Mata Pelajaran, Pusat Kurikulum dan Pembelajaran](https://kurikulum.kemendikdasmen.go.id/panduan-mapel), sebagai pintu rujukan penerjemahan CP menjadi pembelajaran.
- [Kisi-kisi resmi TKA SMA, Rumah Pendidikan](https://pusatinformasi.rumahpendidikan.kemendikdasmen.go.id/hc/id/articles/52474934733209-Belajar-Lebih-Terarah-dengan-Kisi-Kisi-Resmi-TKA-untuk-Jenjang-SMA-MA-Sederajat-dan-SMK-MAK-dari-Pusmendik), diperbarui **15 Oktober 2026**. Artikel resmi memuat cakupan penalaran Matematika, membaca tekstual/inferensial/evaluatif Bahasa Indonesia, serta membaca Bahasa Inggris A2–B1.

Soal dan stimulus tidak disalin dari buku atau bank soal pihak lain. Rujukan menunjukkan **acuan kompetensi**, bukan klaim bahwa soal proyek adalah soal resmi pemerintah, soal TKA asli, atau sudah disahkan guru mitra. Situs contoh soal TKA sempat tidak dapat dimuat; paket ini tidak mengklaim menyalin atau memverifikasi keseluruhan contoh soal dari situs tersebut.

## Pemetaan konten

| Mapel            | Topik                          | Kode      | Fokus                                          |
| ---------------- | ------------------------------ | --------- | ---------------------------------------------- |
| Matematika       | Transformasi fungsi            | MTK-01–06 | Translasi, refleksi, skala, komposisi          |
| Matematika       | Busur dan juring               | MTK-07–12 | Panjang busur, luas, pemodelan                 |
| Matematika       | Kaidah pencacahan              | MTK-13–18 | Aturan perkalian, permutasi, kombinasi         |
| Matematika       | Peluang dan data               | MTK-19–24 | Peluang bersyarat/majemuk, rata-rata, asosiasi |
| Bahasa Inggris   | Informational reading          | ING-01–06 | Detail, inferensi, batas kesimpulan            |
| Bahasa Inggris   | Narrative reading              | ING-07–12 | Konflik, motivasi, perkembangan tokoh          |
| Bahasa Inggris   | Argument and evidence          | ING-13–18 | Usulan, alasan, relevansi bukti                |
| Bahasa Inggris   | Procedures and practical texts | ING-19–24 | Urutan, tenggat, syarat dan pemecahan masalah  |
| Bahasa Indonesia | Informasi dan struktur teks    | IND-01–06 | Detail, gagasan utama, ringkasan               |
| Bahasa Indonesia | Inferensi dan argumentasi      | IND-07–12 | Asumsi, simpulan, evaluasi usulan              |
| Bahasa Indonesia | Evaluasi klaim dan kebahasaan  | IND-13–18 | Kecukupan bukti, kausalitas, kalimat efektif   |
| Bahasa Indonesia | Apresiasi teks sastra          | IND-19–24 | Tokoh, citraan, bahasa kias dan makna          |

Setiap soal memiliki kode, kompetensi, tingkat kesulitan, empat opsi, satu kunci, dan pembahasan. Katalog dan rujukan berada di `src/lib/curriculum/catalog.ts`; isi berkunci berada di `src/lib/server/curriculum-content.ts` dengan penanda `server-only`.

## Alur guru

1. Masuk sebagai guru dan buka **Paket kelas XII**.
2. Pilih mapel; buka rincian soal untuk memeriksa stimulus, opsi, kunci, dan pembahasan. Unduhan CSV juga tersedia melalui endpoint khusus guru, tidak di folder publik.
3. Sesuaikan penilaian dengan ATP serta kebutuhan kelas. Centang peninjauan hanya setelah isi diperiksa.
4. Tekan **Impor 24 soal ke bank saya**. Identitas pembuat di database diisi server dari sesi guru; impor ulang melewati duplikat.
5. Soal menjadi milik bank guru tersebut dan hanya tersedia bagi siswa yang mengikuti kelasnya. Soal dapat disunting melalui bank soal; riwayat lama tidak dihitung ulang.

Siswa tidak dapat membuka rincian paket, mengunduh CSV berkunci, atau menjalankan aksi impor. Pengakuan peninjauan bukan sertifikasi pedagogis dan bukan mekanisme otorisasi tunggal: pemeriksaan peran server tetap wajib.

## Database dan kompatibilitas

Migration baru `20261027034148_required_subjects_grade12.sql` menambah `topics.subject`, `topics.curriculum_track`, indeks filter, penjagaan klasifikasi, larangan prasyarat lintas mapel, dan 12 topik paket. ID topik database dihasilkan PostgreSQL; tidak memakai UUID demo sebagai identitas sekolah. Soal paket tidak ditambahkan otomatis oleh migration.

Limit, turunan, dan integral dari dataset lama ditandai **pengayaan** dan tidak masuk daftar latihan wajib. Baris soal, jawaban, BKT, dan sesi lama tetap disimpan. Riwayat tetap dapat ditinjau. Pengelompokan mapel/kategori dibuat tetap setelah topik dibuat agar riwayat tidak berubah arti; untuk klasifikasi baru, buat topik baru.

Jika core dan seed sudah terpasang, **jangan menjalankannya ulang**. Terapkan migration bank guru (jika belum) lalu migration tiga mapel. Skema baru perlu terpasang sebelum fitur paket digunakan dalam mode Supabase. Peninjauan dan impor dilakukan guru setelah aplikasi dikonfigurasi.

## Batas cakupan

Paket ini bahan awal asesmen formatif, bukan seluruh isi kurikulum, ujian standar, atau prediksi soal TKA. Pengetahuan prasyarat dari fase sebelumnya digunakan pada beberapa soal mudah. Format baru hanya pilihan ganda satu jawaban; belum mengukur pilihan ganda kompleks, menyimak, berbicara, atau menulis produktif. Guru perlu melengkapi penilaian dan menguji mutu item dengan siswa mitra. Estimasi BKT bukan nilai rapor atau sertifikasi kompetensi.
