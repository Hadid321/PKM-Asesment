# Email Adaptiva untuk pelaksanaan PKM

Rekomendasi untuk sekitar 100 peserta: Brevo Free, dengan kuota 300 email per hari. Sediakan kuota untuk konfirmasi, kirim ulang, dan pemulihan akun. Kuota harian tidak menjamin 100 pendaftaran serentak berhasil.

## Pengaturan sekali sebelum kegiatan

1. Buat akun Brevo dan aktifkan email transaksional. Verifikasi domain adaptiva-sman1pp.my.id dengan catatan DNS yang diberikan Brevo (termasuk DKIM/DMARC sesuai petunjuk akun). Jangan mengganti catatan DNS lain sembarangan.
2. Verifikasi alamat pengirim pada domain tersebut. Gunakan nama pengirim **Adaptiva** dan alamat yang benar-benar sudah diverifikasi.
3. Di pengaturan Authentication → SMTP proyek sekolah, aktifkan Custom SMTP. Salin host, port, login SMTP dan **SMTP key** dari akun Brevo. SMTP key berbeda dari kata sandi akun dan API key.
4. Simpan kredensial hanya di pengaturan SMTP; tidak di source code atau percakapan. Nama pengirim Adaptiva tidak memerlukan perubahan algoritma ataupun database aplikasi.
5. Pastikan Site URL memakai https://www.adaptiva-sman1pp.my.id dan Redirect URL konfirmasi memakai https://www.adaptiva-sman1pp.my.id/auth/confirm. Uji email konfirmasi dan pemulihan menggunakan akun panitia.
6. Periksa batas Auth proyek. Setelah custom SMTP diaktifkan, batas email awal Supabase adalah 30 per jam. Sesuaikan dengan kuota penyedia dan kebutuhan kegiatan, misalnya 120 per jam, lalu uji. Ada pula batas signup/signin/resend berdasarkan IP: default 30 permintaan per lima menit; satu Wi-Fi sekolah bisa berbagi IP.
7. Siapkan akun peserta secara bertahap sebelum hari H. Uji satu kelompok kecil pada Wi-Fi sekolah, termasuk login, kirim ulang dan pemulihan akun. Jangan menaikkan semua batas tanpa pemeriksaan.

Pengirim bawaan Supabase terbatas dua email per jam dan hanya untuk alamat anggota tim; tidak cukup untuk registrasi publik PKM. Template email dapat memakai identitas Adaptiva, tetapi nama/alamat pengirim memerlukan custom SMTP. Paket gratis Brevo dapat tetap menambahkan branding Brevo.

Alternatif Resend Free membatasi 100 email per hari, sehingga lebih dari 100 peserta ditambah kirim ulang dapat melewati kuota. Periksa kembali ketentuan penyedia sebelum hari H.

## Sumber resmi (diperiksa 10 November 2026)

- [Batas Brevo Free](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan)
- [SMTP transaksional Brevo](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP)
- [Custom SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp)
- [Batas Auth Supabase](https://supabase.com/docs/guides/auth/rate-limits)
- [Paket Resend](https://resend.com/pricing)


## Cadangan pengiriman email untuk hari H

Custom SMTP mengganti jalur pengiriman email, bukan mengganti Supabase Auth. Kuota email, pembatasan login/pendaftaran, kapasitas database, dan gangguan layanan Auth adalah hal berbeda. Jika Auth menolak karena batas endpoint atau sedang terganggu, SMTP cadangan tidak mengatasi penolakan tersebut.

- Utama: Brevo Free (300 email/hari).
- Cadangan: SMTP2GO Free (200 email/hari, 1.000 email/bulan). Verifikasi domain pengirim lebih dahulu; tanpa verifikasi domain, batas 25 email/jam berlaku.
- Siapkan kedua akun dan DNS pengirim sebelum kegiatan. Gunakan identitas Adaptiva pada domain yang telah diverifikasi.
- Pada konfigurasi SMTP standar proyek, pergantian penyedia dilakukan pengelola secara manual. Belum ada failover otomatis di aplikasi ini.
- Saat email terlambat, periksa log Auth dan log penyedia dahulu. Hindari klik kirim ulang bertubi-tubi. Jika masalah ada pada penyedia pengirim, pindahkan konfigurasi SMTP ke akun cadangan, uji satu email, lalu arahkan peserta mengirim ulang seperlunya.
- Jika masalahnya pembatasan Auth, ikuti batas proyek dan jadwalkan pendaftaran bertahap. Jangan menonaktifkan konfirmasi atau membangun login alternatif mendadak.
- Siapkan dan konfirmasikan akun peserta sebelum hari H agar kegiatan tidak bergantung pada pengiriman email serentak.

Sumber resmi tambahan: [SMTP2GO Free Plan](https://support.smtp2go.com/hc/en-gb/articles/223087947-Free-Plan), [Custom SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp).
