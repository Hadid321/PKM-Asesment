-- Pembaruan aditif: tiga mapel wajib SMA kelas XII. Tidak menghapus riwayat/soal.
-- Soal paket tetap di server dan baru masuk bank sekolah setelah ditinjau serta diimpor guru.
begin;
alter table public.topics add column subject text not null default 'matematika'
  check(subject in ('matematika','bahasa-inggris','bahasa-indonesia'));
alter table public.topics add column curriculum_track text not null default 'wajib'
  check(curriculum_track in ('wajib','pengayaan'));
-- Kalkulus fixture lama bukan cakupan Matematika wajib paket ini.
update public.topics set curriculum_track='pengayaan'
  where subject='matematika' and slug in ('limit-fungsi','turunan-fungsi','integral-dasar');
create index topics_subject_track_order_idx on public.topics(subject,curriculum_track,sort_order);

create function private.guard_topic_classification() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.subject is distinct from old.subject or new.curriculum_track is distinct from old.curriculum_track
    then raise exception 'Mapel dan kategori tetap; buat topik baru'; end if;
  return new;
end;
$$;
revoke all on function private.guard_topic_classification() from public,anon,authenticated;
grant execute on function private.guard_topic_classification() to service_role;
create trigger topics_classification_fixed before update of subject,curriculum_track on public.topics
  for each row execute function private.guard_topic_classification();

create function private.guard_prerequisite_subject() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if (select subject from public.topics where id=new.topic_id) is distinct from
     (select subject from public.topics where id=new.prerequisite_topic_id)
    then raise exception 'Prasyarat harus dalam mapel yang sama'; end if;
  return new;
end;
$$;
revoke all on function private.guard_prerequisite_subject() from public,anon,authenticated;
grant execute on function private.guard_prerequisite_subject() to service_role;
create trigger prerequisites_same_subject before insert or update on public.topic_prerequisites
  for each row execute function private.guard_prerequisite_subject();

-- ID dihasilkan database; relasi mengacu slug sehingga tidak bergantung pada UUID fixture.
insert into public.topics(name,slug,description,subject,curriculum_track,sort_order,material_title,material_url)
select name,slug,description,subject,curriculum_track,sort_order,material_title,material_url
from jsonb_to_recordset($curriculum$[{"name":"Transformasi fungsi","slug":"mtk-transformasi-fungsi","description":"Menganalisis translasi, refleksi, dilatasi, dan komposisi transformasi grafik fungsi.","subject":"matematika","curriculum_track":"wajib","sort_order":100,"material_title":"Rujukan kompetensi dan kisi-kisi","material_url":"https://pusatinformasi.rumahpendidikan.kemendikdasmen.go.id/hc/id/articles/52474934733209-Belajar-Lebih-Terarah-dengan-Kisi-Kisi-Resmi-TKA-untuk-Jenjang-SMA-MA-Sederajat-dan-SMK-MAK-dari-Pusmendik"},{"name":"Busur dan juring lingkaran","slug":"mtk-busur-juring","description":"Menghubungkan sudut pusat, panjang busur, luas juring, dan persoalan lingkaran.","subject":"matematika","curriculum_track":"wajib","sort_order":101,"material_title":"Rujukan kompetensi dan kisi-kisi","material_url":"https://pusatinformasi.rumahpendidikan.kemendikdasmen.go.id/hc/id/articles/52474934733209-Belajar-Lebih-Terarah-dengan-Kisi-Kisi-Resmi-TKA-untuk-Jenjang-SMA-MA-Sederajat-dan-SMK-MAK-dari-Pusmendik"},{"name":"Kaidah pencacahan","slug":"mtk-kaidah-pencacahan","description":"Membedakan aturan perkalian, permutasi, dan kombinasi dalam situasi sehari-hari.","subject":"matematika","curriculum_track":"wajib","sort_order":102,"material_title":"Rujukan kompetensi dan kisi-kisi","material_url":"https://pusatinformasi.rumahpendidikan.kemendikdasmen.go.id/hc/id/articles/52474934733209-Belajar-Lebih-Terarah-dengan-Kisi-Kisi-Resmi-TKA-untuk-Jenjang-SMA-MA-Sederajat-dan-SMK-MAK-dari-Pusmendik"},{"name":"Peluang dan penalaran data","slug":"mtk-peluang-data","description":"Menalar kejadian majemuk, peluang bersyarat, dan hubungan pada data.","subject":"matematika","curriculum_track":"wajib","sort_order":103,"material_title":"Rujukan kompetensi dan kisi-kisi","material_url":"https://pusatinformasi.rumahpendidikan.kemendikdasmen.go.id/hc/id/articles/52474934733209-Belajar-Lebih-Terarah-dengan-Kisi-Kisi-Resmi-TKA-untuk-Jenjang-SMA-MA-Sederajat-dan-SMK-MAK-dari-Pusmendik"},{"name":"Informational reading","slug":"ing-informational-reading","description":"Memahami tujuan, detail, dan implikasi teks informasi berbahasa Inggris.","subject":"bahasa-inggris","curriculum_track":"wajib","sort_order":104,"material_title":"Rujukan kompetensi dan kisi-kisi","material_url":"https://pusatinformasi.rumahpendidikan.kemendikdasmen.go.id/hc/id/articles/52474934733209-Belajar-Lebih-Terarah-dengan-Kisi-Kisi-Resmi-TKA-untuk-Jenjang-SMA-MA-Sederajat-dan-SMK-MAK-dari-Pusmendik"},{"name":"Narrative reading","slug":"ing-narrative-reading","description":"Menafsirkan alur, motivasi tokoh, dan nilai dalam narasi berbahasa Inggris.","subject":"bahasa-inggris","curriculum_track":"wajib","sort_order":105,"material_title":"Rujukan kompetensi dan kisi-kisi","material_url":"https://pusatinformasi.rumahpendidikan.kemendikdasmen.go.id/hc/id/articles/52474934733209-Belajar-Lebih-Terarah-dengan-Kisi-Kisi-Resmi-TKA-untuk-Jenjang-SMA-MA-Sederajat-dan-SMK-MAK-dari-Pusmendik"},{"name":"Argument and evidence","slug":"ing-argument-evaluation","description":"Membaca pendapat, hubungan logis, batas klaim, dan bukti pendukung.","subject":"bahasa-inggris","curriculum_track":"wajib","sort_order":106,"material_title":"Rujukan kompetensi dan kisi-kisi","material_url":"https://pusatinformasi.rumahpendidikan.kemendikdasmen.go.id/hc/id/articles/52474934733209-Belajar-Lebih-Terarah-dengan-Kisi-Kisi-Resmi-TKA-untuk-Jenjang-SMA-MA-Sederajat-dan-SMK-MAK-dari-Pusmendik"},{"name":"Procedures and practical texts","slug":"ing-procedure-reading","description":"Menggunakan instruksi, pengumuman, dan teks praktis dalam situasi sekolah.","subject":"bahasa-inggris","curriculum_track":"wajib","sort_order":107,"material_title":"Rujukan kompetensi dan kisi-kisi","material_url":"https://pusatinformasi.rumahpendidikan.kemendikdasmen.go.id/hc/id/articles/52474934733209-Belajar-Lebih-Terarah-dengan-Kisi-Kisi-Resmi-TKA-untuk-Jenjang-SMA-MA-Sederajat-dan-SMK-MAK-dari-Pusmendik"},{"name":"Informasi dan struktur teks","slug":"indo-informasi-teks","description":"Menemukan informasi, gagasan utama, dan hubungan antarbagian teks informasi.","subject":"bahasa-indonesia","curriculum_track":"wajib","sort_order":108,"material_title":"Rujukan kompetensi dan kisi-kisi","material_url":"https://pusatinformasi.rumahpendidikan.kemendikdasmen.go.id/hc/id/articles/52474934733209-Belajar-Lebih-Terarah-dengan-Kisi-Kisi-Resmi-TKA-untuk-Jenjang-SMA-MA-Sederajat-dan-SMK-MAK-dari-Pusmendik"},{"name":"Inferensi dan argumentasi","slug":"indo-inferensi-argumen","description":"Menafsirkan informasi tersirat, simpulan, dan hubungan alasan dalam argumen.","subject":"bahasa-indonesia","curriculum_track":"wajib","sort_order":109,"material_title":"Rujukan kompetensi dan kisi-kisi","material_url":"https://pusatinformasi.rumahpendidikan.kemendikdasmen.go.id/hc/id/articles/52474934733209-Belajar-Lebih-Terarah-dengan-Kisi-Kisi-Resmi-TKA-untuk-Jenjang-SMA-MA-Sederajat-dan-SMK-MAK-dari-Pusmendik"},{"name":"Evaluasi klaim dan kebahasaan","slug":"indo-evaluasi-klaim","description":"Menilai kekuatan bukti, keandalan informasi, dan ketepatan bahasa.","subject":"bahasa-indonesia","curriculum_track":"wajib","sort_order":110,"material_title":"Rujukan kompetensi dan kisi-kisi","material_url":"https://pusatinformasi.rumahpendidikan.kemendikdasmen.go.id/hc/id/articles/52474934733209-Belajar-Lebih-Terarah-dengan-Kisi-Kisi-Resmi-TKA-untuk-Jenjang-SMA-MA-Sederajat-dan-SMK-MAK-dari-Pusmendik"},{"name":"Apresiasi teks sastra","slug":"indo-apresiasi-sastra","description":"Mengapresiasi tokoh, konflik, citraan, dan makna kias dalam teks sastra.","subject":"bahasa-indonesia","curriculum_track":"wajib","sort_order":111,"material_title":"Rujukan kompetensi dan kisi-kisi","material_url":"https://pusatinformasi.rumahpendidikan.kemendikdasmen.go.id/hc/id/articles/52474934733209-Belajar-Lebih-Terarah-dengan-Kisi-Kisi-Resmi-TKA-untuk-Jenjang-SMA-MA-Sederajat-dan-SMK-MAK-dari-Pusmendik"}]$curriculum$::jsonb)
as t(name text,slug text,description text,subject text,curriculum_track text,sort_order integer,material_title text,material_url text)
on conflict(slug) do nothing;
update private.app_revision set revision=revision+1 where id=1;
commit;
