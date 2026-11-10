-- CBT is private: student tokens cannot read answer snapshots through the Data API.
-- Existing practice data and BKT tables are retained unchanged.
begin;
create table private.cbt_exams (
 id uuid primary key,
 teacher_id uuid not null references public.profiles(id) on delete restrict,
 class_id uuid not null references public.classes(id) on delete restrict,
 payload jsonb not null check(jsonb_typeof(payload)='object' and payload->>'id'=id::text and payload->>'teacher_id'=teacher_id::text and payload->>'class_id'=class_id::text)
);
create index cbt_exams_teacher_idx on private.cbt_exams(teacher_id);
create index cbt_exams_class_idx on private.cbt_exams(class_id);
create index cbt_exams_fingerprints_idx on private.cbt_exams using gin((payload->'fingerprints'));
create table private.cbt_sittings (
 id uuid primary key,
 exam_id uuid not null references private.cbt_exams(id) on delete restrict,
 student_id uuid not null references public.profiles(id) on delete restrict,
 payload jsonb not null check(jsonb_typeof(payload)='object' and payload->>'id'=id::text and payload->>'exam_id'=exam_id::text and payload->>'student_id'=student_id::text),
 unique(exam_id,student_id)
);
create index cbt_sittings_student_idx on private.cbt_sittings(student_id);
create unique index cbt_one_active_idx on private.cbt_sittings(student_id) where payload->>'status'='active';
alter table private.cbt_exams enable row level security;
alter table private.cbt_sittings enable row level security;
revoke all on private.cbt_exams,private.cbt_sittings from public,anon,authenticated;
grant all on private.cbt_exams,private.cbt_sittings to service_role;
create function private.cbt_same_question(stem text,choices jsonb,item jsonb) returns boolean
language sql immutable set search_path='' as $$
 select lower(regexp_replace(btrim(stem),'\s+',' ','g'))=lower(regexp_replace(btrim(item->>'question_text'),'\s+',' ','g'))
 and array(select lower(regexp_replace(btrim(value),'\s+',' ','g')) from jsonb_each_text(choices) order by lower(regexp_replace(btrim(value),'\s+',' ','g')) collate "C")
 = array(select lower(regexp_replace(btrim(value),'\s+',' ','g')) from jsonb_each_text(item->'options') order by lower(regexp_replace(btrim(value),'\s+',' ','g')) collate "C");
$$;
revoke all on function private.cbt_same_question(text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function private.cbt_same_question(text,jsonb,jsonb) to service_role;
create function private.protect_active_cbt_questions() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from private.app_revision where id=1 for update;
 if exists(select 1 from private.cbt_exams e cross join lateral jsonb_array_elements(e.payload->'items') item where not (e.payload->>'released')::boolean and private.cbt_same_question(new.question_text,new.options,item)) then raise exception 'CBT_ACTIVE_PRACTICE_OVERLAP'; end if;
 return new;
end;
$$;
revoke all on function private.protect_active_cbt_questions() from public,anon,authenticated;
grant execute on function private.protect_active_cbt_questions() to service_role;
create trigger protect_active_cbt_questions before insert or update of question_text,options on public.questions for each row execute function private.protect_active_cbt_questions();

create function public.read_cbt_state(actor_id uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare actor_role text;
begin
 select role into actor_role from public.profiles where id=actor_id;
 if actor_role is null then raise exception 'Invalid actor'; end if;
 return jsonb_build_object(
  'revision',(select revision from private.app_revision where id=1),
  'state',jsonb_build_object(
   'exams',coalesce((select jsonb_agg(e.payload order by e.payload->>'created_at') from private.cbt_exams e where
    (actor_role='teacher' and e.teacher_id=actor_id and exists(select 1 from public.classes c where c.id=e.class_id and c.teacher_id=actor_id))
    or (actor_role='student' and (exists(select 1 from public.class_members m where m.class_id=e.class_id and m.student_id=actor_id) or exists(select 1 from private.cbt_sittings s where s.exam_id=e.id and s.student_id=actor_id)))),'[]'::jsonb),
   'sittings',coalesce((select jsonb_agg(s.payload order by s.payload->>'started_at') from private.cbt_sittings s join private.cbt_exams e on e.id=s.exam_id where
    (actor_role='student' and s.student_id=actor_id) or (actor_role='teacher' and e.teacher_id=actor_id and exists(select 1 from public.classes c where c.id=e.class_id and c.teacher_id=actor_id))),'[]'::jsonb)
  ));
end;
$$;

create function public.commit_cbt_state(actor_id uuid,expected_revision bigint,changes jsonb) returns boolean
language plpgsql security invoker set search_path='' as $$
declare actor_role text; revision_now bigint; data jsonb; old jsonb; exam jsonb; row_id uuid; owner_id uuid;
begin
 select revision into revision_now from private.app_revision where id=1 for update;
 if revision_now<>expected_revision then return false; end if;
 select role into actor_role from public.profiles where id=actor_id;
 if actor_role is null or jsonb_typeof(changes)<>'object' then raise exception 'Invalid actor or input'; end if;
 if jsonb_typeof(changes->'exams')<>'array' or jsonb_typeof(changes->'sittings')<>'array'
 or jsonb_array_length(changes->'exams')>24 or jsonb_array_length(changes->'sittings')>500 then raise exception 'Invalid changes'; end if;
 for data in select value from jsonb_array_elements(changes->'exams') loop
  row_id:=(data->>'id')::uuid;
  select payload into old from private.cbt_exams where id=row_id;
  if actor_role<>'teacher' or (data->>'teacher_id')::uuid<>actor_id
    or not exists(select 1 from public.classes where id=(data->>'class_id')::uuid and teacher_id=actor_id) then raise exception 'Exam ownership'; end if;
  if old is not null then
   if old->>'teacher_id'<>actor_id::text or (data-array['status','released','closed_at'])<>(old-array['status','released','closed_at'])
    or (old->>'status'='closed' and data->>'status'<>'closed')
    or ((old->>'released')::boolean and not (data->>'released')::boolean) then raise exception 'Immutable exam'; end if;
  else
   if exists(select 1 from public.questions q cross join lateral jsonb_array_elements(data->'items') item where private.cbt_same_question(q.question_text,q.options,item)) then raise exception 'CBT_PRACTICE_OVERLAP'; end if;
   if jsonb_array_length(data->'fingerprints')<>24 or (select count(distinct value) from jsonb_array_elements_text(data->'fingerprints'))<>24 then raise exception 'Invalid fingerprints'; end if;
   if exists(select 1 from private.cbt_exams e where (e.payload->>'released')::boolean and (e.payload->'fingerprints') ?| array(select jsonb_array_elements_text(data->'fingerprints'))) then raise exception 'CBT_PACKET_EXPOSED'; end if;
   if data->>'status'<>'open' or (data->>'released')::boolean or jsonb_array_length(data->'items')<>24
    or (data->>'duration_minutes')::integer not between 5 and 180
    or data->>'subject' not in ('matematika','bahasa-inggris','bahasa-indonesia') then raise exception 'Invalid exam'; end if;
   if (select count(distinct i->>'id') from jsonb_array_elements(data->'items') i)<>24
    or (select count(*) from jsonb_array_elements(data->'items') i join public.topics t on t.id=(i->>'topic_id')::uuid where t.subject=data->>'subject')<>24 then raise exception 'Invalid exam items'; end if;
  end if;
  if (data->>'released')::boolean and (data->>'status'<>'closed' or exists(select 1 from private.cbt_sittings s where s.exam_id=row_id and s.payload->>'status'='active' and (s.payload->>'deadline_at')::timestamptz>clock_timestamp())) then raise exception 'Close before release'; end if;
  if (data->>'released')::boolean and exists(select 1 from private.cbt_exams e where e.id<>row_id and e.payload->>'status'='open' and (e.payload->'fingerprints') ?| array(select jsonb_array_elements_text(data->'fingerprints'))) then raise exception 'CBT_PACKET_BUSY'; end if;
  insert into private.cbt_exams(id,teacher_id,class_id,payload) values(row_id,actor_id,(data->>'class_id')::uuid,data)
   on conflict(id) do update set payload=excluded.payload;
 end loop;
 for data in select value from jsonb_array_elements(changes->'sittings') loop
  row_id:=(data->>'id')::uuid; owner_id:=(data->>'student_id')::uuid;
  select payload into old from private.cbt_sittings where id=row_id;
  select e.payload into exam from private.cbt_exams e where e.id=(data->>'exam_id')::uuid;
  if exam is null then raise exception 'Exam missing'; end if;
  if actor_role='student' then
   if owner_id<>actor_id or not exists(select 1 from public.class_members m where m.class_id=(exam->>'class_id')::uuid and m.student_id=actor_id) then raise exception 'Sitting ownership'; end if;
   if old is null then
    if exam->>'status'<>'open' or data->>'status'<>'active' or (data->>'version')::integer<>0
     or data->'answers'<>'{}'::jsonb
     or abs(extract(epoch from (clock_timestamp()-(data->>'started_at')::timestamptz)))>60
     or (data->>'deadline_at')::timestamptz<>(data->>'started_at')::timestamptz+make_interval(mins=>(exam->>'duration_minutes')::integer)
     then raise exception 'Invalid start'; end if;
    if jsonb_array_length(data->'order')<>24 or
      (select count(distinct value) from jsonb_array_elements_text(data->'order'))<>24 or
      exists(select 1 from jsonb_array_elements_text(data->'order') v where not exists(select 1 from jsonb_array_elements(exam->'items') i where i->>'id'=v)) then raise exception 'Invalid order'; end if;
    if exists(select 1 from jsonb_each(data->'option_orders') o where jsonb_array_length(o.value)<>4 or (select count(distinct value) from jsonb_array_elements_text(o.value) where value in ('A','B','C','D'))<>4)
     or (select count(*) from jsonb_each(data->'option_orders'))<>24 then raise exception 'Invalid options'; end if;
   else
    if (data-array['answers','status','submitted_at','end_reason','version'])<>(old-array['answers','status','submitted_at','end_reason','version'])
     or (data->>'version')::integer<>(old->>'version')::integer+1
     or old->>'status'<>'active' then raise exception 'Immutable sitting'; end if;
    if ((old->>'deadline_at')::timestamptz<=clock_timestamp() or exam->>'status'='closed') and data->'answers'<>old->'answers' then raise exception 'Deadline passed'; end if;
    if exists(select 1 from jsonb_each(data->'answers') a where not exists(select 1 from jsonb_array_elements(exam->'items') i where i->>'id'=a.key) or a.value->>'option' is not null and a.value->>'option' not in ('A','B','C','D')) then raise exception 'Invalid answer'; end if;
   end if;
  elsif actor_role='teacher' then
   if old is null or exam->>'teacher_id'<>actor_id::text or not exists(select 1 from public.classes c where c.id=(exam->>'class_id')::uuid and c.teacher_id=actor_id)
    or (data-array['status','submitted_at','end_reason','version'])<>(old-array['status','submitted_at','end_reason','version'])
    or data->>'status'<>'submitted' or old->>'status'<>'active' or (data->>'version')::integer<>(old->>'version')::integer+1
    or (exam->>'status'<>'closed' and (old->>'deadline_at')::timestamptz>clock_timestamp()) then raise exception 'Teacher cannot change answers'; end if;
  else raise exception 'Invalid role'; end if;
  if data->>'status' not in ('active','submitted') or ((data->>'status'='submitted')<>(data->>'submitted_at' is not null)) then raise exception 'Invalid status'; end if;
  insert into private.cbt_sittings(id,exam_id,student_id,payload) values(row_id,(data->>'exam_id')::uuid,owner_id,data)
   on conflict(id) do update set payload=excluded.payload;
 end loop;
 update private.app_revision set revision=revision+1 where id=1;
 return true;
end;
$$;
revoke all on function public.read_cbt_state(uuid),public.commit_cbt_state(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.read_cbt_state(uuid),public.commit_cbt_state(uuid,bigint,jsonb) to service_role;
commit;
