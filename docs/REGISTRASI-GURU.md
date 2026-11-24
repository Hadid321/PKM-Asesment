# Registrasi guru dengan undangan

Hak administrator adalah keanggotaan terpisah di school_admins, bukan role pengajaran baru. Role student/teacher, kelas, bank soal, dan asesmen tidak diubah saat pemasangan. Administrator tetap memiliki role pembelajaran asalnya; gunakan akun operator khusus.

## Pemasangan
1. Cadangkan database dan uji SQL supabase/teacher-invitations.sql pada staging. SQL ini pemasangan satu kali, bukan seed.
2. Jalankan SQL tersebut di database sekolah sebelum deploy.
3. Operator sekolah harus memiliki akun terverifikasi. Di SQL Editor privat, gunakan UUID profil operator yang telah diverifikasi secara langsung:
   ```sql
   insert into public.school_admins(user_id) values ('UUID_OPERATOR_SEKOLAH') on conflict do nothing;
   ```
   Jangan menggunakan akun demo bersama atau mengangkat seluruh guru menjadi administrator.
4. Deploy branch setelah pengujian; operator masuk dan membuka Profil > Administrasi sekolah.
5. Buat undangan untuk email guru. Kirim kode secara privat. Guru membuat akun biasa, konfirmasi email, masuk, lalu aktivasi di /aktivasi-guru. Undangan hanya berlaku tujuh hari dan sekali pakai.

## Checklist sebelum merge
- npm ci, npm run lint, npm run typecheck, npm test, npm run build.
- Pengguna anonim tidak dapat melakukan issue/revoke/redeem.
- Siswa dan guru tanpa keanggotaan admin tidak dapat melihat panel /admin atau membuat/mencabut undangan.
- Undangan dengan email berbeda, kedaluwarsa, dicabut, atau digunakan tidak mengubah role.
- Dua permintaan redeem bersamaan tidak dapat menggunakan kode dua kali; RPC transaksi mengunci profil dan update undangan secara kondisional.
- Akun guru lama tetap guru; akun siswa biasa tetap siswa. RLS bank soal/kelas/CBT tidak berubah.
- Kode mentah hanya dikembalikan saat dibuat; database menyimpan SHA-256 dari token acak 192-bit.
- Verifikasi privilege RPC hanya service_role dan tabel baru tidak dapat diakses anon/authenticated.
- Pengujian manual: undang guru uji, verifikasi email, aktivasi, periksa dashboard, lalu cek audit log.

## Batasan
Panel tidak menonaktifkan akun guru yang sudah aktif, karena pencabutan akses guru lama memerlukan audit seluruh otorisasi kelas/CBT dan rencana pemindahan kepemilikan kelas. Tidak ada penghapusan data. Undangan dikirim manual oleh admin; tidak ada pengiriman email otomatis selain konfirmasi akun bawaan.
