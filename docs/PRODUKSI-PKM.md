# Konfigurasi produksi PKM

Target: `Hadid321/PKM-Asesment`, branch `main`, Vercel `hrsxrs-projects/pkm-aja`, domain `https://pkm-aja.vercel.app`, Supabase `ezakqewuucepaglzezbq`. Jangan gunakan proyek/tim lain.

## Konfirmasi email menuju domain produksi

Di [Supabase → Authentication → URL Configuration](https://supabase.com/dashboard/project/ezakqewuucepaglzezbq/auth/url-configuration):

- **Site URL**: `https://pkm-aja.vercel.app`
- **Redirect URLs**: tambahkan `https://pkm-aja.vercel.app/auth/confirm`.

Di [Authentication → Email Templates](https://supabase.com/dashboard/project/ezakqewuucepaglzezbq/auth/templates), pilih **Confirm signup**. Salin HTML dari `supabase/templates/confirmation.html`, dengan tautan:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email">Konfirmasi alamat email</a>
```

Simpan kedua pengaturan. Tautan pada email lama tidak berubah; gunakan email baru setelah konfigurasi diperbarui. Jangan memasukkan token/hash email ke laporan atau chat. Template hash mendukung pembukaan tautan dari perangkat lain. Aplikasi juga mendukung template bawaan dengan kode PKCE, yang memerlukan browser pendaftaran beserta cookie verifier-nya. Jika browser berbeda sudah mengonfirmasi email tetapi sesi tidak terbentuk, masuk kembali dengan email dan kata sandi.

Aplikasi mengirim `emailRedirectTo` dari `APP_URL` tepercaya, menerima hash jenis `email` atau kode PKCE, menukar token melalui client SSR, lalu mengarah ke `/dashboard`. Parameter `next` tidak diterima. Callback memakai `no-store` dan `no-referrer`. Site URL/allowlist di layanan Supabase tetap harus benar.

## Key server dan dashboard

Variabel **Production** di [Vercel](https://vercel.com/hrsxrs-projects/pkm-aja/settings/environment-variables):

| Nama | Isi |
| --- | --- |
| `APP_MODE` | `supabase` |
| `APP_URL` | `https://pkm-aja.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ezakqewuucepaglzezbq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key proyek yang sama |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret `sb_secret_...` atau legacy `service_role`, jenis Secret, hanya server |
| `GROQ_ENABLED` | `false` untuk fungsi inti tanpa LLM |

Login memakai publishable key; pembacaan dashboard menggunakan key administratif server setelah identitas dan peran diperiksa. Karena itu login bisa berhasil sementara dashboard gagal jika key server masih placeholder. Setelah perubahan environment, deployment baru diperlukan. Key tidak perlu dikirim melalui chat atau dimasukkan ke Git.

Migration inti dan seed yang sudah ada jangan dijalankan ulang. Pada 27 Oktober 2026, dua migration lanjutan bank guru dan mapel wajib telah diterapkan melalui konektor ke proyek ini. Semua migration sumber tetap disimpan di `supabase/migrations/`; history core/seed tidak tercatat karena sebelumnya dipasang manual.

Migration tambahan `restrict_auto_rls_function_access` juga telah diterapkan untuk menutup EXECUTE publik pada helper event trigger. Pemilik dan event trigger tetap berfungsi. Security Advisor menyisakan warning leaked password protection; info RLS tanpa policy pada tabel revision private memang sesuai pembatasan akses. Performance Advisor melaporkan enam FK tanpa covering index sebagai INFO; belum ada pengukuran beban produksi dan indeks tidak dihapus hanya karena belum digunakan.

## Pendaftaran sekitar 30 siswa

Uji lokal memeriksa 30 request pendaftaran dari satu IP dengan provider Auth mock, dan pembuatan 30 profil pada PostgreSQL lokal. Setiap profil tetap berperan siswa dan snapshot tidak memuat data teman. Ini bukan pengukuran beban Supabase/Vercel produksi atau pengiriman 30 email nyata.

Email bawaan Supabase dibatasi **2 email per jam**, hanya ditujukan untuk pengembangan/pengujian, serta membatasi penerima. Siapkan **custom SMTP** dan pengirim/domain yang diverifikasi sebelum pendaftaran satu kelas. Default custom SMTP adalah 30 pesan per jam; sediakan ruang untuk email ulang, recovery, serta kuota penyedia SMTP. Jangan menghapus konfirmasi email untuk menghindari batas tersebut. Lihat [SMTP](https://supabase.com/docs/guides/auth/auth-smtp) dan [rate limits](https://supabase.com/docs/guides/auth/rate-limits).

Limiter proses aplikasi mengizinkan 60 request auth/menit/IP agar 30 siswa dari jaringan sekolah tidak berhenti pada batas lama 25. Limiter ini bukan perlindungan terdistribusi; batas Supabase dan platform tetap berlaku. Sebelum sesi kelas, uji alur dengan akun penguji milik sekolah dan periksa pembatasan IP jika sekolah memakai satu koneksi.

Untuk kuis serentak, adapter saat ini memakai satu revision global dan maksimal lima percobaan transaksi. Konflik ditolak dengan 409 untuk dikirim ulang, serta unique constraint mencegah penghitungan jawaban ganda. Belum ada uji beban produksi 30 peserta serentak; jangan menyatakan kapasitas terjamin hanya berdasarkan jumlah akun.

RLS, otorisasi guru, isolasi siswa, larangan menaikkan role sendiri, serta akses RPC service-role diuji. Pemeriksaan ini tidak berarti semua risiko keamanan sudah hilang. Peringatan leaked password protection masih perlu ditangani sesuai fitur paket Supabase; tidak ada perubahan paket berbayar otomatis.
