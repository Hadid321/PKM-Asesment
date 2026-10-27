-- ADMINISTRATOR SAJA: salin ke SQL Editor privat, ubah email DI EDITOR.
-- Akun harus sudah dibuat di Auth. Tidak pernah dijalankan otomatis oleh aplikasi.
begin;
do $$
declare target_id uuid;
begin
  select id into strict target_id from auth.users where email='GANTI_DENGAN_EMAIL_GURU';
  update public.profiles set role='teacher' where id=target_id;
  if not found then raise exception 'Profil belum tersedia; periksa migration dan trigger Auth'; end if;
end;
$$;
-- Tinjau profil hasil promosi. Jangan bagikan hasil yang memuat identitas.
select id,full_name,role from public.profiles where role='teacher';
commit;
