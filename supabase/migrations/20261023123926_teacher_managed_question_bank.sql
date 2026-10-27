-- Migration lanjutan: aman dijalankan SETELAH assessment_core.sql + seed.sql.
-- Tidak menghapus soal seed, akun, attempts, mastery, atau riwayat sesi.
begin;

drop policy if exists questions_teacher_read on public.questions;
create policy questions_teacher_read on public.questions for select to authenticated
  using(private.is_teacher() and created_by=(select auth.uid()));

create or replace function public.read_assessment_state(actor_id uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare actor_role text; result jsonb;
begin
  select role into actor_role from public.profiles where id=actor_id;
  if actor_role is null then raise exception 'Aktor tidak valid'; end if;
  with rooms as (
    select c.* from public.classes c
    where (actor_role='teacher' and c.teacher_id=actor_id)
      or (actor_role='student' and exists(select 1 from public.class_members m where m.class_id=c.id and m.student_id=actor_id))
  ), visible_students as (
    select actor_id as id where actor_role='student'
    union select m.student_id from public.class_members m join rooms c on c.id=m.class_id where actor_role='teacher'
  )
  select jsonb_build_object('revision',(select revision from private.app_revision where id=1),'state',jsonb_build_object(
    'profiles',coalesce((select jsonb_agg(to_jsonb(p)) from public.profiles p where p.id=actor_id or p.id in(select id from visible_students)),'[]'::jsonb),
    'classes',coalesce((select jsonb_agg(to_jsonb(c)) from rooms c),'[]'::jsonb),
    'class_members',coalesce((select jsonb_agg(to_jsonb(m)) from public.class_members m where m.class_id in(select id from rooms) and (actor_role='teacher' or m.student_id=actor_id)),'[]'::jsonb),
    'topics',coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order) from public.topics t),'[]'::jsonb),
    'topic_prerequisites',coalesce((select jsonb_agg(to_jsonb(e)) from public.topic_prerequisites e),'[]'::jsonb),
    'questions',coalesce((select jsonb_agg(to_jsonb(q)) from public.questions q where
      q.created_by is not null
      and exists(select 1 from public.profiles author where author.id=q.created_by and author.role='teacher')
      and ((actor_role='teacher' and q.created_by=actor_id) or (actor_role='student' and q.created_by in(select teacher_id from rooms)))),'[]'::jsonb),
    'attempts',coalesce((select jsonb_agg(to_jsonb(a) order by a.answered_at,a.id) from public.attempts a where a.student_id in(select id from visible_students)),'[]'::jsonb),
    'mastery',coalesce((select jsonb_agg(to_jsonb(m)) from public.mastery m where m.student_id in(select id from visible_students)),'[]'::jsonb),
    'quiz_sessions',coalesce((select jsonb_agg(to_jsonb(s)) from public.quiz_sessions s where s.student_id in(select id from visible_students)),'[]'::jsonb)
  )) into result;
  return result;
end;
$$;
revoke all on function public.read_assessment_state(uuid) from public,anon,authenticated;
grant execute on function public.read_assessment_state(uuid) to service_role;

-- Pertahanan tambahan: soal aktif harus milik guru yang kelasnya diikuti siswa.
-- Sesi lama berbasis seed tidak dihapus; aplikasi menutupnya dengan riwayat utuh.
create or replace function private.guard_session_question() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.current_question_id is not null and not exists(
    select 1 from public.questions q
    join public.profiles author on author.id=q.created_by and author.role='teacher'
    join public.classes c on c.teacher_id=q.created_by
    join public.class_members m on m.class_id=c.id and m.student_id=new.student_id
    where q.id=new.current_question_id and q.topic_id=new.topic_id
  ) then raise exception 'Soal harus berasal dari guru kelas siswa'; end if;
  return new;
end;
$$;
revoke all on function private.guard_session_question() from public,anon,authenticated;
grant execute on function private.guard_session_question() to service_role;
drop trigger if exists sessions_teacher_bank on public.quiz_sessions;
create trigger sessions_teacher_bank before insert or update of current_question_id on public.quiz_sessions
  for each row execute function private.guard_session_question();
create index if not exists sessions_active_question_idx on public.quiz_sessions(current_question_id) where status='active';

-- Menandai snapshot yang dibaca sebelum perubahan aturan sebagai usang.
update private.app_revision set revision=revision+1 where id=1;
commit;
