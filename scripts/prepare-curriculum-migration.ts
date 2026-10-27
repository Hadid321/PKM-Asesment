import { writeFile } from "node:fs/promises";
import { curriculumTopics } from "../src/lib/curriculum/catalog";
const filename =
  "supabase/migrations/20261027034148_required_subjects_grade12.sql";
const rows = curriculumTopics().map(
  ({
    name,
    slug,
    description,
    subject,
    curriculum_track,
    sort_order,
    material_title,
    material_url,
  }) => ({
    name,
    slug,
    description,
    subject,
    curriculum_track,
    sort_order,
    material_title,
    material_url,
  }),
);
const sql = `-- Pembaruan aditif: tiga mapel wajib SMA kelas XII. Tidak menghapus riwayat/soal.
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
from jsonb_to_recordset($curriculum$${JSON.stringify(rows)}$curriculum$::jsonb)
as t(name text,slug text,description text,subject text,curriculum_track text,sort_order integer,material_title text,material_url text)
on conflict(slug) do nothing;
update private.app_revision set revision=revision+1 where id=1;
commit;
`;
await writeFile(filename, sql, "utf8");
console.log(
  `Migration disiapkan: ${filename}; ${rows.length} topik; belum diterapkan ke layanan eksternal.`,
);
