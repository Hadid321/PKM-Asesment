# Verifikasi tiga mapel — 27 Oktober 2026

Pembaruan ini menambah pilihan Matematika, Bahasa Inggris, dan Bahasa Indonesia pada dashboard, latihan, rekomendasi, serta rekap guru; klasifikasi wajib/pengayaan; dan paket 72 soal orisinal yang hanya dapat ditinjau/diimpor guru.

| Pemeriksaan aktual            | Hasil                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Lint                          | Lulus tanpa error/warning                                                                                          |
| TypeScript strict             | Lulus                                                                                                              |
| Unit/domain/PostgreSQL PGlite | 96 tes lulus pada delapan berkas                                                                                   |
| Build produksi Webpack        | Lulus                                                                                                              |
| HTTP mode demo                | 30 pemeriksaan lulus                                                                                               |
| Paket dalam browser           | Guru dapat memilih Bahasa Inggris, membuka soal dan pembahasan, lalu mengimpor; impor ulang melaporkan 24 duplikat |

Tes baru mencakup 72 kode/isi unik, validitas schema setiap soal, 24 soal per mapel dan dua soal per tingkat pada setiap topik, penolakan siswa/peninjauan kosong, kepemilikan guru, impor idempotent, pembatalan saat slug bentrok, BKT terpisah, prasyarat lintas mapel, kategori pengayaan dan DTO tanpa kunci. PGlite menjalankan migration baru setelah dua migration sebelumnya dan menguji RPC impor paket dengan kolom tambahan.

Pengujian HTTP memeriksa sesi sampai selesai pada **masing-masing mapel**, dengan penguasaan topik lain tetap utuh. Endpoint unduhan paket ditolak bagi siswa. Pada halaman server yang menggunakan streaming, redirect akses dapat berada dalam HTML berstatus 200; tes memastikan tujuan `/akses` dan tidak adanya konten/kunci paket pada HTML siswa, selain pemeriksaan 403 pada API.

Pemeriksaan browser awal menemukan kebutuhan memisahkan stimulus bacaan panjang dari judul pertanyaan dan menampilkan penanda opsi A/B/C/D pada tinjauan guru. Kedua tampilan diperbaiki. Pemeriksaan visual lanjutan terhenti karena alat Computer Use tidak dapat memastikan URL Chrome; perubahan akhir tersebut diperiksa melalui lint, TypeScript dan build, belum diverifikasi visual ulang.

Tidak ada dependency baru. Dokumen CP resmi 046/H/KR/2025 berhasil diunduh untuk pemeriksaan teks, tetapi PDF dan hasil ekstraknya tetap di `.data/research/` yang diabaikan Git. Rujukan CP yang relevan: halaman PDF 99 (Bahasa Indonesia umum), 119–120 (Matematika umum), 133/138 (Bahasa Inggris umum). Artikel kisi-kisi resmi Rumah Pendidikan yang diperiksa bertanggal pembaruan 15 Oktober 2026. Soal proyek adalah konten orisinal, bukan salinan soal resmi atau bank soal yang teruji empiris.

Seluruh data pengujian mode demo tetap di `.data/demo.json`, tidak ikut Git. Tidak ada penghapusan data sekolah, promosi akun guru, pemakaian Groq sungguhan, atau deployment yang dijalankan dalam pembaruan ini. Pengujian Supabase hosted masih bergantung pada akses ke proyek target dan konfigurasi Auth/RLS nyata; keberhasilan PostgreSQL lokal bukan bukti integrasi proyek pengguna.
