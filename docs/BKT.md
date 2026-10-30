# Bayesian Knowledge Tracing pada Adaptiva

Parameter prototipe berada di `src/lib/domain/bkt.ts`: `initial = 0,3`, `learn = 0,1`, `guess = 0,2`, `slip = 0,1`. Ini asumsi awal, belum hasil kalibrasi ilmiah.

- **P(L0)**: peluang penguasaan sebelum ada jawaban untuk suatu topik.
- **T**: peluang belajar setelah satu kesempatan latihan.
- **G**: peluang benar meski belum menguasai (menebak).
- **S**: peluang salah meski sudah menguasai (slip).

Dengan p sebagai peluang sebelumnya, posterior jawaban benar adalah `p(1−S) / [p(1−S) + (1−p)G]`. Untuk jawaban salah: `pS / [pS + (1−p)(1−G)]`. Setelah posterior dihitung, terapkan belajar: `P(L_next) = posterior + (1−posterior)T`.

Contoh p=0,3: benar menghasilkan **0,69268293**; salah menghasilkan **0,14576271**. Kode dan test memverifikasi urutan posterior kemudian learning. Seluruh parameter harus finite dan berada dalam [0,1]. Pada bukti mustahil (penyebut nol untuk parameter ekstrem), pertahankan prior sebagai posterior kemudian terapkan T; perilaku ini eksplisit agar tidak menghasilkan NaN. Nilai disimpan dengan pembulatan delapan desimal, sesuai `numeric(10,8)` PostgreSQL.

Mastery disimpan per pasangan siswa–topik. Sesi berikutnya memakai nilai terakhir, bukan mengulang P(L0). Setiap percobaan menyimpan p sebelumnya dan sesudahnya, serta snapshot pembahasan/kunci saat penilaian untuk mempertahankan makna riwayat jika soal kemudian diedit. Soal yang sedang aktif dikerjakan tidak dapat diedit; topik soal yang sudah memiliki riwayat tidak dapat dipindahkan.

Kesulitan berikutnya: p<0,4 mudah; 0,4≤p≤0,7 sedang; p>0,7 sulit. Soal yang sudah dijawab dalam sesi dikeluarkan. Jika tingkat target kosong, pilih tingkat terdekat; jarak sama mendahulukan yang lebih mudah. Penjagaan pembelajaran mencegah lompatan langsung dari tingkat mudah ke sulit ketika p<0,4. Jika hanya soal sulit tersisa, sesi ditutup dengan alasan guru perlu melengkapi soal pada tingkat yang sesuai. Jika keadaan ini sudah terjadi sebelum sesi dimulai, tidak ada sesi kosong yang dibuat. Parameter dan rumus BKT tidak berubah. Urutan ID menstabilkan hasil pada input yang sama. Batas 10 jawaban dan ambang p≥0,95 tetap berlaku.

Rekomendasi mengurutkan topik berdasarkan p terendah, kemudian sort_order. Topik tanpa riwayat menggunakan P(L0). Sebelum memasukkan topik, kunjungi prasyarat yang nilainya ≤0,6 secara rekursif. Prasyarat di atas 0,6 tidak menghalangi topik lemah. Kunjungan disimpan agar tiap topik hanya muncul sekali. Siklus dan hubungan ke dirinya sendiri ditolak ketika disimpan oleh fungsi TypeScript serta trigger PostgreSQL.

Rencana latihan membagi hasil urutan tersebut menjadi topik yang memiliki soal pada tingkat yang dapat dikerjakan dan topik yang menunggu guru. Urutan BKT/prasyarat di masing-masing kelompok dipertahankan; prasyarat yang belum mempunyai soal tetap terlihat pada kelompok menunggu guru. Ringkasan, kartu hasil, dan input prioritas Groq memakai mapel serta kategori sesi yang sama. Dashboard, latihan, dan rencana belajar memakai kebijakan ketersediaan yang sama. Hasil lama memakai skor/pembaruan BKT historis, sedangkan tindakan berikutnya dihitung dari bank yang tersedia saat dibuka; ringkasan tersimpan tidak ditulis ulang di database.

Persentase benar bersifat deskriptif: benar/jumlah jawaban. BKT adalah estimasi laten yang dipengaruhi urutan jawaban dan asumsi G/S/T; nilainya tidak sama dengan persentase benar. Ambang 95% tidak membuktikan penguasaan pasti. Model belum memperhitungkan lupa, waktu respons, kualitas soal, perbedaan kemampuan awal, atau parameter per kesulitan. Evaluasi validitas asesmen, kalibrasi dengan data berizin, dan analisis kesalahan prediksi diperlukan sebelum menarik kesimpulan ilmiah. LLM tidak menghitung atau mengubah satu pun nilai ini.
