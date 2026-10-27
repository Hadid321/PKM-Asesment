-- Hanya untuk proyek baru. Seluruh waktu timestamptz; probabilitas numeric(10,8).
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null check (char_length(full_name) between 1 and 100),
  role text not null default 'student' check (role in ('student','teacher')),
  created_at timestamptz not null default now()
);
create table public.classes (
  id uuid primary key default gen_random_uuid(), name text not null check (char_length(name) between 1 and 100),
  class_code text not null unique check (char_length(class_code) between 6 and 20),
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index classes_teacher_idx on public.classes(teacher_id);
create table public.class_members (
  class_id uuid not null references public.classes(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  joined_at timestamptz not null default now(), primary key(class_id,student_id)
);
create index members_student_idx on public.class_members(student_id);
create table public.topics (
  id uuid primary key default gen_random_uuid(), name text not null check(char_length(name) between 1 and 100),
  slug text not null unique check(slug ~ '^[a-z0-9-]+$'), description text not null check(char_length(description) between 1 and 1000),
  sort_order integer not null default 0, material_title text not null default '' check(char_length(material_title)<=160),
  material_url text not null default '' check(char_length(material_url)<=1200 and (material_url='' or material_url ~ '^https://' or material_url ~ '^/materi/[a-z0-9-]+$')),
  created_at timestamptz not null default now()
);
create table public.topic_prerequisites (
  topic_id uuid not null references public.topics(id) on delete restrict,
  prerequisite_topic_id uuid not null references public.topics(id) on delete restrict,
  primary key(topic_id,prerequisite_topic_id), check(topic_id<>prerequisite_topic_id)
);
create function private.valid_options(o jsonb) returns boolean language sql immutable set search_path='' as $$
  select jsonb_typeof(o)='object' and o ?& array['A','B','C','D']
    and (select count(*)=4 from jsonb_object_keys(o))
    and not exists(select 1 from jsonb_each(o) where jsonb_typeof(value)<>'string' or char_length(value#>>'{}') not between 1 and 600)
    and (select count(distinct lower(value#>>'{}'))=4 from jsonb_each(o));
$$;
create table public.questions (
  id uuid primary key default gen_random_uuid(), topic_id uuid not null references public.topics(id) on delete restrict,
  question_text text not null check(char_length(question_text) between 1 and 3000),
  options jsonb not null check(private.valid_options(options)),
  correct_option text not null check(correct_option in ('A','B','C','D')),
  difficulty text not null check(difficulty in ('easy','medium','hard')),
  explanation text not null check(char_length(explanation) between 1 and 3000),
  created_by uuid references public.profiles(id) on delete restrict,
  fingerprint text not null check(char_length(fingerprint)=64),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,topic_id)
);
create unique index question_fingerprint_idx on public.questions(coalesce(created_by,'00000000-0000-0000-0000-000000000000'::uuid),fingerprint);
create index questions_topic_level_idx on public.questions(topic_id,difficulty);
create index questions_creator_idx on public.questions(created_by);
-- Tabel tambahan untuk penguncian sesi, batas 10 soal, dan klaim ringkasan satu kali.
create table public.quiz_sessions (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id) on delete restrict,
  topic_id uuid not null references public.topics(id) on delete restrict,
  current_question_id uuid references public.questions(id) on delete restrict,
  status text not null check(status in ('active','completed')), end_reason text,
  started_at timestamptz not null default now(), completed_at timestamptz,
  summary text check(char_length(summary)<=3000), summary_source text check(summary_source in ('template','groq')),
  summary_claimed boolean not null default false, unique(id,student_id),
  check((status='active' and completed_at is null) or (status='completed' and completed_at is not null and current_question_id is null))
);
create unique index one_active_session_idx on public.quiz_sessions(student_id) where status='active';
create index sessions_student_time_idx on public.quiz_sessions(student_id,started_at);
create table public.attempts (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id) on delete restrict,
  question_id uuid not null, session_id uuid not null, topic_id uuid not null references public.topics(id) on delete restrict,
  is_correct boolean not null, selected_option text not null check(selected_option in ('A','B','C','D')),
  correct_option text not null check(correct_option in ('A','B','C','D')),
  question_text text not null, explanation text not null,
  p_before numeric(10,8) not null check(p_before between 0 and 1), p_after numeric(10,8) not null check(p_after between 0 and 1),
  answered_at timestamptz not null default now(), unique(session_id,question_id),
  foreign key(session_id,student_id) references public.quiz_sessions(id,student_id) on delete restrict,
  foreign key(question_id,topic_id) references public.questions(id,topic_id) on delete restrict
);
create index attempts_student_time_idx on public.attempts(student_id,answered_at);
create index attempts_question_idx on public.attempts(question_id);
create table public.mastery (
  student_id uuid not null references public.profiles(id) on delete restrict,
  topic_id uuid not null references public.topics(id) on delete restrict,
  p_l numeric(10,8) not null check(p_l between 0 and 1), updated_at timestamptz not null default now(),
  primary key(student_id,topic_id)
);
-- Satu revision lock untuk transaksi optimistis TypeScript pada skala uji coba kecil.
create table private.app_revision (id integer primary key check(id=1), revision bigint not null default 0);
insert into private.app_revision(id) values(1);
alter table private.app_revision enable row level security;
grant all on private.app_revision to service_role;

create function private.create_student_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,full_name,role) values(new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'),''),'Siswa'),100),'student');
  return new;
end;
$$;
revoke all on function private.create_student_profile() from public;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_student_profile();

create function private.is_teacher() returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid() and role='teacher');
$$;
create function private.teaches(sid uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.classes c join public.class_members m on m.class_id=c.id where c.teacher_id=auth.uid() and m.student_id=sid);
$$;
create function private.in_class(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.class_members where class_id=cid and student_id=auth.uid());
$$;
revoke all on function private.is_teacher(), private.teaches(uuid), private.in_class(uuid), private.valid_options(jsonb) from public;
grant execute on function private.is_teacher(), private.teaches(uuid), private.in_class(uuid) to authenticated;
grant execute on function private.valid_options(jsonb) to service_role;

create function private.prevent_cycle() returns trigger language plpgsql set search_path='' as $$
begin
  if exists(with recursive reach(id) as (
    select new.prerequisite_topic_id union select e.prerequisite_topic_id from public.topic_prerequisites e join reach r on e.topic_id=r.id
  ) select 1 from reach where id=new.topic_id) then raise exception 'Prasyarat melingkar'; end if;
  return new;
end;
$$;
revoke all on function private.prevent_cycle() from public;
create trigger prerequisites_no_cycle before insert or update on public.topic_prerequisites for each row execute function private.prevent_cycle();

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.topics enable row level security;
alter table public.topic_prerequisites enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.mastery enable row level security;
alter table public.quiz_sessions enable row level security;
revoke all on public.profiles, public.classes, public.class_members, public.topics, public.topic_prerequisites, public.questions, public.attempts, public.mastery, public.quiz_sessions from anon, authenticated;
grant select on public.profiles, public.classes, public.class_members, public.topics, public.topic_prerequisites, public.questions, public.attempts, public.mastery, public.quiz_sessions to authenticated;
grant update(full_name) on public.profiles to authenticated;
grant all on public.profiles, public.classes, public.class_members, public.topics, public.topic_prerequisites, public.questions, public.attempts, public.mastery, public.quiz_sessions to service_role;
create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or (role='student' and private.teaches(id)));
create policy profiles_name on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy classes_read on public.classes for select to authenticated using(teacher_id=(select auth.uid()) or private.in_class(id));
create policy members_read on public.class_members for select to authenticated using(student_id=(select auth.uid()) or exists(select 1 from public.classes c where c.id=class_id and c.teacher_id=(select auth.uid())));
create policy topics_read on public.topics for select to authenticated using((select auth.uid()) is not null);
create policy prerequisites_read on public.topic_prerequisites for select to authenticated using((select auth.uid()) is not null);
-- Siswa sama sekali tidak menerima baris bank soal lewat Data API. Hanya DTO server.
create policy questions_teacher_read on public.questions for select to authenticated using(private.is_teacher() and (created_by=(select auth.uid()) or created_by is null));
create policy attempts_read on public.attempts for select to authenticated using(student_id=(select auth.uid()) or private.teaches(student_id));
create policy mastery_read on public.mastery for select to authenticated using(student_id=(select auth.uid()) or private.teaches(student_id));
create policy sessions_read on public.quiz_sessions for select to authenticated using(student_id=(select auth.uid()) or private.teaches(student_id));

-- RPC SECURITY INVOKER, hanya service_role. UUID aktor berasal dari auth.getUser() di server.
create function public.read_assessment_state(actor_id uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare actor_role text; result jsonb;
begin
  select role into actor_role from public.profiles where id=actor_id;
  if actor_role is null then raise exception 'Aktor tidak valid'; end if;
  with rooms as (select c.* from public.classes c where (actor_role='teacher' and c.teacher_id=actor_id) or (actor_role='student' and exists(select 1 from public.class_members m where m.class_id=c.id and m.student_id=actor_id))),
  visible_students as (select actor_id as id where actor_role='student' union select m.student_id from public.class_members m join rooms c on c.id=m.class_id where actor_role='teacher')
  select jsonb_build_object('revision',(select revision from private.app_revision where id=1),'state',jsonb_build_object(
    'profiles',coalesce((select jsonb_agg(to_jsonb(p)) from public.profiles p where p.id=actor_id or p.id in(select id from visible_students)),'[]'::jsonb),
    'classes',coalesce((select jsonb_agg(to_jsonb(c)) from rooms c),'[]'::jsonb),
    'class_members',coalesce((select jsonb_agg(to_jsonb(m)) from public.class_members m where m.class_id in(select id from rooms) and (actor_role='teacher' or m.student_id=actor_id)),'[]'::jsonb),
    'topics',coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order) from public.topics t),'[]'::jsonb),
    'topic_prerequisites',coalesce((select jsonb_agg(to_jsonb(e)) from public.topic_prerequisites e),'[]'::jsonb),
    'questions',coalesce((select jsonb_agg(to_jsonb(q)) from public.questions q where q.created_by is null or (actor_role='teacher' and q.created_by=actor_id) or (actor_role='student' and q.created_by in(select teacher_id from rooms))),'[]'::jsonb),
    'attempts',coalesce((select jsonb_agg(to_jsonb(a) order by a.answered_at,a.id) from public.attempts a where a.student_id in(select id from visible_students)),'[]'::jsonb),
    'mastery',coalesce((select jsonb_agg(to_jsonb(m)) from public.mastery m where m.student_id in(select id from visible_students)),'[]'::jsonb),
    'quiz_sessions',coalesce((select jsonb_agg(to_jsonb(s)) from public.quiz_sessions s where s.student_id in(select id from visible_students)),'[]'::jsonb)
  )) into result;
  return result;
end;
$$;

create function public.commit_assessment_state(actor_id uuid,expected_revision bigint,changes jsonb) returns boolean language plpgsql security invoker set search_path='' as $$
declare current_revision bigint; actor_role text; row_data jsonb; table_name text; attempt_row public.attempts; old_session public.quiz_sessions; q public.questions;
begin
  select revision into current_revision from private.app_revision where id=1 for update;
  if current_revision<>expected_revision then return false; end if;
  select role into actor_role from public.profiles where id=actor_id;
  if actor_role is null then raise exception 'Aktor tidak valid'; end if;
  for row_data in select value from jsonb_array_elements(coalesce(changes->'profiles','[]')) loop
    if (row_data->>'id')::uuid<>actor_id then raise exception 'Profil tidak diizinkan'; end if;
    update public.profiles set full_name=row_data->>'full_name' where id=actor_id;
  end loop;
  if actor_role<>'teacher' and (jsonb_array_length(coalesce(changes->'classes','[]'))>0 or jsonb_array_length(coalesce(changes->'questions','[]'))>0 or jsonb_array_length(coalesce(changes->'topics','[]'))>0 or jsonb_array_length(coalesce(changes->'prerequisite_topics','[]'))>0) then raise exception 'Hanya guru'; end if;
  for row_data in select value from jsonb_array_elements(coalesce(changes->'classes','[]')) loop
    if (row_data->>'teacher_id')::uuid<>actor_id or exists(select 1 from public.classes where id=(row_data->>'id')::uuid and teacher_id<>actor_id) then raise exception 'Kelas tidak diizinkan'; end if;
    insert into public.classes select (jsonb_populate_record(null::public.classes,row_data)).* on conflict(id) do update set name=excluded.name;
  end loop;
  for row_data in select value from jsonb_array_elements(coalesce(changes->'topics','[]')) loop
    insert into public.topics select (jsonb_populate_record(null::public.topics,row_data)).* on conflict(id) do update set name=excluded.name,slug=excluded.slug,description=excluded.description,material_title=excluded.material_title,material_url=excluded.material_url;
  end loop;
  for row_data in select value from jsonb_array_elements(coalesce(changes->'questions','[]')) loop
    if (row_data->>'created_by')::uuid is distinct from actor_id or exists(select 1 from public.questions where id=(row_data->>'id')::uuid and created_by is distinct from actor_id) then raise exception 'Soal tidak diizinkan'; end if;
    if exists(select 1 from public.quiz_sessions where status='active' and current_question_id=(row_data->>'id')::uuid) then raise exception 'Soal sedang dikerjakan'; end if;
    insert into public.questions select (jsonb_populate_record(null::public.questions,row_data)).* on conflict(id) do update set topic_id=excluded.topic_id,question_text=excluded.question_text,options=excluded.options,correct_option=excluded.correct_option,difficulty=excluded.difficulty,explanation=excluded.explanation,fingerprint=excluded.fingerprint,updated_at=excluded.updated_at;
  end loop;
  for row_data in select value from jsonb_array_elements(coalesce(changes->'attempts','[]')) loop
    attempt_row:=jsonb_populate_record(null::public.attempts,row_data);
    if actor_role<>'student' or attempt_row.student_id<>actor_id then raise exception 'Percobaan tidak diizinkan'; end if;
    select * into old_session from public.quiz_sessions where id=attempt_row.session_id and student_id=actor_id;
    select * into q from public.questions where id=attempt_row.question_id;
    if old_session.id is null or q.id is null or old_session.status<>'active' or old_session.current_question_id<>q.id or old_session.topic_id<>q.topic_id then raise exception 'Soal tidak sesuai sesi'; end if;
    if attempt_row.is_correct is distinct from (attempt_row.selected_option=q.correct_option) or attempt_row.correct_option<>q.correct_option then raise exception 'Penilaian tidak valid'; end if;
    if (select count(*) from public.attempts where session_id=old_session.id)>=10 then raise exception 'Maksimal 10 soal'; end if;
    if abs(attempt_row.p_before-coalesce((select p_l from public.mastery where student_id=actor_id and topic_id=q.topic_id),attempt_row.p_before))>0.00000001 then raise exception 'Prior tidak sesuai'; end if;
    insert into public.attempts select attempt_row.*;
  end loop;
  for row_data in select value from jsonb_array_elements(coalesce(changes->'mastery','[]')) loop
    if actor_role<>'student' or (row_data->>'student_id')::uuid<>actor_id or not exists(select 1 from jsonb_array_elements(coalesce(changes->'attempts','[]')) a where (a->>'topic_id')::uuid=(row_data->>'topic_id')::uuid and (a->>'p_after')::numeric=(row_data->>'p_l')::numeric) then raise exception 'Mastery tidak diizinkan'; end if;
    insert into public.mastery select (jsonb_populate_record(null::public.mastery,row_data)).* on conflict(student_id,topic_id) do update set p_l=excluded.p_l,updated_at=excluded.updated_at;
  end loop;
  for row_data in select value from jsonb_array_elements(coalesce(changes->'quiz_sessions','[]')) loop
    if actor_role<>'student' or (row_data->>'student_id')::uuid<>actor_id or exists(select 1 from public.quiz_sessions where id=(row_data->>'id')::uuid and student_id<>actor_id) then raise exception 'Sesi tidak diizinkan'; end if;
    insert into public.quiz_sessions select (jsonb_populate_record(null::public.quiz_sessions,row_data)).* on conflict(id) do update set current_question_id=excluded.current_question_id,status=excluded.status,end_reason=excluded.end_reason,completed_at=excluded.completed_at,summary=excluded.summary,summary_source=excluded.summary_source,summary_claimed=excluded.summary_claimed;
  end loop;
  for row_data in select value from jsonb_array_elements(coalesce(changes->'prerequisite_topics','[]')) loop
    delete from public.topic_prerequisites where topic_id=(row_data#>>'{}')::uuid;
  end loop;
  insert into public.topic_prerequisites select * from jsonb_populate_recordset(null::public.topic_prerequisites,coalesce(changes->'topic_prerequisites','[]'));
  update private.app_revision set revision=revision+1 where id=1;
  return true;
end;
$$;

create function public.join_assessment_class(actor_id uuid,code text) returns void language plpgsql security invoker set search_path='' as $$
declare cid uuid;
begin
  perform 1 from private.app_revision where id=1 for update;
  if not exists(select 1 from public.profiles where id=actor_id and role='student') then raise exception 'Hanya siswa'; end if;
  select id into cid from public.classes where class_code=code;
  if cid is null then raise exception 'Kode kelas tidak ditemukan'; end if;
  insert into public.class_members(class_id,student_id) values(cid,actor_id) on conflict do nothing;
  update private.app_revision set revision=revision+1 where id=1;
end;
$$;
revoke all on function public.read_assessment_state(uuid),public.commit_assessment_state(uuid,bigint,jsonb),public.join_assessment_class(uuid,text) from public,anon,authenticated;
grant execute on function public.read_assessment_state(uuid),public.commit_assessment_state(uuid,bigint,jsonb),public.join_assessment_class(uuid,text) to service_role;
