# Persiapan email Adaptiva — 11 November 2026

Status: empat catatan DNS telah disimpan di IDwebhost dan terverifikasi cocok oleh Brevo pada 11 November 2026. Brevo menampilkan domain sebagai Authenticated dan pengirim Adaptiva <no-reply@mail.adaptiva-sman1pp.my.id> sebagai Verified. SMTP key Adaptiva-Supabase-Production telah dibuat atas persetujuan pengguna, tipe Standard dengan kedaluwarsa 11 Februari 2027. Custom SMTP Supabase sudah disimpan memakai pengirim Adaptiva, server Brevo dan port 587. Pengiriman email belum diuji.

Nameserver publik domain berada di IDwebhost (`ns1.idwebhost.id` dan `ns2.idwebhost.id`). Gunakan pengelolaan DNS domain `adaptiva-sman1pp.my.id`, bukan pengaturan domain Vercel. Tidak perlu mengganti nameserver atau catatan website.

Domain pengiriman yang disiapkan: `mail.adaptiva-sman1pp.my.id`. Host relatif di bawah ini berlaku pada zona `adaptiva-sman1pp.my.id`. Jika pengelola DNS meminta nama lengkap, tambahkan `.adaptiva-sman1pp.my.id` satu kali saja.

| Tipe | Host relatif | Nilai dari Brevo |
| --- | --- | --- |
| TXT | mail | brevo-code:2bc14da4df452dcfd4c466baac0dc8b9 |
| CNAME | brevo1._domainkey.mail | b1.mail-adaptiva-sman1pp-my-id.dkim.brevo.com |
| CNAME | brevo2._domainkey.mail | b2.mail-adaptiva-sman1pp-my-id.dkim.brevo.com |
| TXT | _dmarc.mail | v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com |

Keempat catatan telah disimpan dan diverifikasi melalui DNS otoritatif IDwebhost, lalu dinyatakan cocok oleh Brevo. Sebelum penambahan, hanya ada A untuk website dan CNAME www; tidak ada DMARC yang ditimpa. Catatan `rua` mengarahkan laporan agregat ke Brevo; bukan SMTP key. Jangan membuat dua DMARC untuk nama host yang sama.

Semua nilai di tabel adalah catatan DNS publik, bukan SMTP key. **Verify records** dan **Authenticate domain** berhasil dijalankan. Domain `mail.adaptiva-sman1pp.my.id` berstatus **Authenticated**. Ikuti nilai terbaru yang ditampilkan akun jika konfigurasi berubah.

## Pengirim dan SMTP

- Nama pengirim: **Adaptiva**.
- Alamat pengirim terverifikasi: `no-reply@mail.adaptiva-sman1pp.my.id`. Alamat ini tidak dianggap kotak masuk bantuan.
- Host: `smtp-relay.brevo.com`.
- Port: `587`.
- Login: gunakan nilai **Login** pada halaman SMTP akun Brevo.
- Password: **SMTP key** khusus integrasi, bukan API key atau password akun. Sudah dibuat dan dipasang hanya pada pengaturan SMTP Supabase. Jangan menyimpan key dalam dokumen, source code, screenshot, atau chat.
- Simpan hanya pada Custom SMTP proyek Supabase sekolah `ezakqewuucepaglzezbq`.

## Email konfirmasi

- Subjek: **Konfirmasi akun Adaptiva Anda**.
- Isi: `supabase/templates/confirmation.html`.
- Site URL harus `https://www.adaptiva-sman1pp.my.id`.
- Link menggunakan `/auth/confirm?token_hash={{ .TokenHash }}&type=email`, sesuai route aplikasi yang sudah ada. Jangan mengaktifkan pelacakan klik pada tautan autentikasi.
- Template konfirmasi dan subjek sudah disimpan di dashboard Supabase. Site URL serta redirect `/auth/confirm` pada domain sekolah juga sudah diverifikasi tersimpan.

Pengirim/domain dan Custom SMTP sudah terverifikasi tersimpan. Uji pengiriman nyata masih tertahan karena kontrol Chrome mengalami timeout, sehingga belum ada klaim email terkirim/diterima. Uji satu email panitia sampai konfirmasi berhasil dan dashboard terbuka sebelum membuka pendaftaran massal. Batas Auth yang terlihat masih 30 email/jam, terpisah dari kuota Brevo 300 email/hari. Dua puluh lima pendaftaran menyisakan sedikit ruang untuk kirim ulang; belum ada uji beban serentak.

Custom SMTP mengganti jalur pengiriman email Auth, bukan cadangan otomatis ketika layanan autentikasi mengalami gangguan. Kunci SMTP berlaku hingga 11 Februari 2027 dan perlu diperbarui sebelum kedaluwarsa. Konfirmasi email tetap aktif.


## Pemeriksaan template lokal

Pratinjau browser pada lebar 390 dan 1440 piksel tidak menunjukkan overflow horizontal. Kedua tautan konfirmasi mengarah ke domain produksi /auth/confirm dengan token contoh dan tipe email. Ini pemeriksaan HTML di browser, belum pengujian Gmail/Outlook atau pengiriman email sungguhan.
