begin;
-- Opt-in only: existing exams retain their original rules and immutable payload.
create table private.assessment_focus_controls (
 sitting_id uuid primary key references private.cbt_sittings(id) on delete restrict,
 strikes integer not null default 0 check(strikes between 0 and 3),
 total_strikes integer not null default 0 check(total_strikes>=strikes),
 locked boolean not null default false, away boolean not null default false,
 pending_since timestamptz, version integer not null default 0,
 current_page uuid, pages jsonb not null default '{}'::jsonb
);
create table private.assessment_focus_actions (
 request_id uuid primary key, sitting_id uuid not null references private.cbt_sittings(id) on delete restrict,
 teacher_id uuid not null references public.profiles(id) on delete restrict,
 reason text not null check(length(btrim(reason)) between 8 and 300),
 recorded_at timestamptz not null default clock_timestamp()
);
alter table private.assessment_focus_controls enable row level security;
alter table private.assessment_focus_actions enable row level security;
revoke all on private.assessment_focus_controls,private.assessment_focus_actions from public,anon,authenticated;
grant select,insert,update on private.assessment_focus_controls to service_role;
grant select,insert on private.assessment_focus_actions to service_role;

create function private.process_assessment_focus(sitting_id uuid,events jsonb,presence jsonb) returns boolean
language plpgsql security invoker set search_path='' as $$
declare c private.assessment_focus_controls; ev jsonb; pg uuid; seq integer; seen integer; add_strike boolean; n timestamptz:=clock_timestamp();
begin
 if not exists(select 1 from private.cbt_sittings s join private.cbt_exams e on e.id=s.exam_id where s.id=sitting_id and e.payload->>'focus_guard'='true') then return true; end if;
 pg:=(presence->>'page_id')::uuid; seq:=(presence->>'sequence')::integer;
 if pg is null or seq is null or seq<1 or seq>1000000 then raise exception 'Invalid focus sequence'; end if;
 insert into private.assessment_focus_controls(sitting_id) values(sitting_id) on conflict do nothing;
 select * into c from private.assessment_focus_controls f where f.sitting_id=process_assessment_focus.sitting_id for update;
 seen:=(c.pages->>pg::text)::integer;
 if seen is not null and seq<=seen then return false; end if;
 if seen is null then
  if not exists(select 1 from jsonb_array_elements(events) v where v->>'kind'='opened') or (select count(*) from jsonb_object_keys(c.pages))>=128 then return false; end if;
  if (presence->>'visible')::boolean and (presence->>'online')::boolean then c.current_page:=pg; end if;
 end if;
 c.pages:=jsonb_set(c.pages,array[pg::text],to_jsonb(seq));
 if c.current_page is distinct from pg and (presence->>'visible')::boolean and (presence->>'online')::boolean and exists(select 1 from jsonb_array_elements(events) v where v->>'kind'='visible') then c.current_page:=pg; end if;
 if c.current_page is distinct from pg then
  update private.assessment_focus_controls f set pages=c.pages where f.sitting_id=c.sitting_id;
  return false;
 end if;
 for ev in select * from jsonb_array_elements(events) loop
  add_strike:=false;
  if ev->>'kind' in ('opened','visible') then add_strike:=c.away and c.pending_since is not null and (presence->>'online')::boolean and n>=c.pending_since+interval '2 seconds'; c.away:=false; c.pending_since:=null;
  elsif ev->>'kind'='hidden' and not c.away then c.away:=true; c.pending_since:=n;
  elsif ev->>'kind'='left_assessment' and (not c.away or c.pending_since is not null) then c.away:=true; add_strike:=true;
  end if;
  if add_strike and not c.locked then
   c.strikes:=c.strikes+1; c.total_strikes:=c.total_strikes+1; c.pending_since:=null; c.locked:=c.strikes>=3; c.version:=c.version+1;
  end if;
 end loop;
 -- Count only a confirmed on-line absence, never a delayed hidden+visible retry.
 if not (presence->>'visible')::boolean and (presence->>'online')::boolean and c.away and c.pending_since is not null and n>=c.pending_since+interval '2 seconds' and not c.locked then
  c.strikes:=c.strikes+1; c.total_strikes:=c.total_strikes+1; c.pending_since:=null; c.locked:=c.strikes>=3; c.version:=c.version+1;
 end if;
 update private.assessment_focus_controls f set strikes=c.strikes,total_strikes=c.total_strikes,locked=c.locked,away=c.away,pending_since=c.pending_since,version=c.version,current_page=c.current_page,pages=c.pages where f.sitting_id=c.sitting_id;
 return true;
end;$$;

create or replace function public.record_assessment_activity(actor_id uuid,sitting_id uuid,events jsonb,presence jsonb) returns boolean
language plpgsql security invoker set search_path='' as $$
declare s private.cbt_sittings; e jsonb; old private.assessment_events; event_count integer; fresh jsonb:='[]'::jsonb; accepted boolean;
begin
 select * into s from private.cbt_sittings where id=sitting_id for update;
 if s.id is null or s.student_id<>actor_id or not exists(select 1 from public.class_members m join private.cbt_exams x on x.class_id=m.class_id where x.id=s.exam_id and m.student_id=actor_id) then raise exception 'Activity forbidden'; end if;
 if s.payload->>'status'<>'active' or (s.payload->>'deadline_at')::timestamptz<=clock_timestamp() or exists(select 1 from private.cbt_exams x where x.id=s.exam_id and x.payload->>'status'<>'open') then return false; end if;
 if jsonb_typeof(events)<>'array' or jsonb_array_length(events)>20 or jsonb_typeof(presence)<>'object' then raise exception 'Invalid activity'; end if;
 select count(*) into event_count from private.assessment_events a where a.sitting_id=record_assessment_activity.sitting_id;
 for e in select * from jsonb_array_elements(events) loop
  if e->>'kind' not in ('opened','hidden','visible','blur','focus','offline','online','fullscreen_exit','left_assessment') or e->>'id' is null then raise exception 'Invalid activity kind'; end if;
  select * into old from private.assessment_events where id=(e->>'id')::uuid;
  if old.id is not null then
   if old.sitting_id<>sitting_id or old.kind<>e->>'kind' then raise exception 'Activity ID reused'; end if;
  elsif event_count<1000 then
   insert into private.assessment_events(id,sitting_id,kind) values((e->>'id')::uuid,sitting_id,e->>'kind');
   event_count:=event_count+1; fresh:=fresh||jsonb_build_array(e);
  end if;
 end loop;
 accepted:=private.process_assessment_focus(sitting_id,fresh,presence);
 if accepted then
  insert into private.assessment_presence values(sitting_id,clock_timestamp(),(presence->>'visible')::boolean,(presence->>'focused')::boolean,(presence->>'online')::boolean,(presence->>'fullscreen')::boolean)
  on conflict on constraint assessment_presence_pkey do update set last_seen=excluded.last_seen,visible=excluded.visible,focused=excluded.focused,online=excluded.online,fullscreen=excluded.fullscreen;
 end if;
 return true;
end;$$;

create function public.read_assessment_focus(actor_id uuid,sitting_ids uuid[]) returns jsonb
language sql security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('sitting_id',s.id,'enabled',coalesce(e.payload->>'focus_guard'='true',false),
 'strikes',coalesce(f.strikes,0),'total_strikes',coalesce(f.total_strikes,0),'limit',3,'locked',coalesce(f.locked,false),'version',coalesce(f.version,0),
 'reason',case when f.locked then 'Pengerjaan dihentikan sementara setelah tiga pelanggaran fokus. Jawaban tersimpan dan waktu tetap berjalan. Hubungi guru untuk meminta izin lanjut.' else null end)),'[]'::jsonb)
 from private.cbt_sittings s join private.cbt_exams e on e.id=s.exam_id left join private.assessment_focus_controls f on f.sitting_id=s.id
 where s.id=any(sitting_ids) and ((s.student_id=actor_id and exists(select 1 from public.class_members m where m.class_id=e.class_id and m.student_id=actor_id)) or (e.teacher_id=actor_id and exists(select 1 from public.classes c where c.id=e.class_id and c.teacher_id=actor_id)));
$$;

create function public.resume_assessment_focus(actor_id uuid,sitting_id uuid,request_id uuid,reason text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare s private.cbt_sittings; e private.cbt_exams; a private.assessment_focus_actions;
begin
 select * into s from private.cbt_sittings where id=sitting_id for update;
 select * into e from private.cbt_exams where id=s.exam_id;
 if s.id is null or e.teacher_id<>actor_id or not exists(select 1 from public.classes c where c.id=e.class_id and c.teacher_id=actor_id) then raise exception 'Focus forbidden'; end if;
 select * into a from private.assessment_focus_actions x where x.request_id=resume_assessment_focus.request_id;
 if a.request_id is not null then
  if a.teacher_id<>actor_id or a.sitting_id<>sitting_id or a.reason<>btrim(reason) then raise exception 'Focus request reused'; end if;
  return true;
 end if;
 if e.payload->>'focus_guard'<>'true' or s.payload->>'status'<>'active' or e.payload->>'status'<>'open' or (s.payload->>'deadline_at')::timestamptz<=clock_timestamp() then raise exception 'Focus no longer active'; end if;
 if length(btrim(reason)) not between 8 and 300 then raise exception 'Invalid focus reason'; end if;
 perform 1 from private.assessment_focus_controls f where f.sitting_id=resume_assessment_focus.sitting_id and f.locked for update;
 if not found then raise exception 'Focus not locked'; end if;
 insert into private.assessment_focus_actions values(request_id,sitting_id,actor_id,btrim(reason),clock_timestamp());
 update private.assessment_focus_controls f set strikes=0,locked=false,away=false,pending_since=null,version=f.version+1 where f.sitting_id=resume_assessment_focus.sitting_id;
 return true;
end;$$;

create function private.enforce_assessment_focus() returns trigger
language plpgsql security invoker set search_path='' as $$
declare e jsonb; f private.assessment_focus_controls;
begin
 select payload into e from private.cbt_exams where id=new.exam_id;
 if e->>'focus_guard'='true' then
  if e->'focus_rules'<> '{"version":"focus-v1","limit":3,"grace_ms":2000}'::jsonb or e->'focus_rules' is null then raise exception 'Invalid focus rules'; end if;
  if tg_op='INSERT' then
   if new.payload->>'policy_acknowledged_at' is null or new.payload->>'policy_acknowledged_at' is distinct from new.payload->>'started_at' then raise exception 'Focus acknowledgement required'; end if;
  else
   if new.payload->'policy_acknowledged_at' is distinct from old.payload->'policy_acknowledged_at' then raise exception 'Immutable focus acknowledgement'; end if;
   select * into f from private.assessment_focus_controls c where c.sitting_id=new.id for update;
   if f.locked and (new.payload->'answers' is distinct from old.payload->'answers' or (old.payload->>'status'='active' and new.payload->>'status'='submitted' and e->>'status'<>'closed' and (old.payload->>'deadline_at')::timestamptz>clock_timestamp())) then raise exception 'ASSESSMENT_FOCUS_LOCKED'; end if;
  end if;
 end if;
 return new;
end;$$;
create trigger enforce_assessment_focus before insert or update on private.cbt_sittings for each row execute function private.enforce_assessment_focus();

-- Students receive only pseudonyms and aggregate scores after their own result is released.
create function public.read_assessment_ranking(actor_id uuid,exam_id uuid) returns jsonb
language sql security invoker set search_path='' as $$
 with allowed as (
 select e.id from private.cbt_exams e where e.id=exam_id and e.payload->>'released'='true'
 and exists(select 1 from private.cbt_sittings s where s.exam_id=e.id and s.student_id=actor_id and s.payload->>'status'='submitted')
 and exists(select 1 from public.class_members m where m.class_id=e.class_id and m.student_id=actor_id)
 ), numbered as (
 select s.*,row_number() over(order by s.payload->>'started_at',s.id) as alias from private.cbt_sittings s join allowed a on a.id=s.exam_id
 ), scored as (
 select s.id,s.student_id,s.alias,
 (select count(*) from jsonb_array_elements(e.payload->'items') q
 where (s.payload->'option_orders'->(q->>'id')->>(case s.payload->'answers'->(q->>'id')->>'option' when 'A' then 0 when 'B' then 1 when 'C' then 2 when 'D' then 3 when 'E' then 4 else null end))=q->>'correct_option') as correct,
 jsonb_array_length(e.payload->'items') as total
 from numbered s join private.cbt_exams e on e.id=s.exam_id where s.payload->>'status'='submitted'
 ), ranked as (
 select *,rank() over(order by correct desc) as position from scored
 )
 select case when exists(select 1 from allowed) then coalesce((select jsonb_agg(jsonb_build_object('rank',position,'label',case when student_id=actor_id then 'Anda' else 'Peserta '||lpad(alias::text,greatest(2,length(alias::text)),'0') end,'score',round(correct*100.0/total),'correct',correct,'total',total,'is_you',student_id=actor_id) order by position,alias) from ranked),'[]'::jsonb) else null end;
$$;
revoke all on function private.process_assessment_focus(uuid,jsonb,jsonb),private.enforce_assessment_focus(),public.read_assessment_focus(uuid,uuid[]),public.resume_assessment_focus(uuid,uuid,uuid,text),public.read_assessment_ranking(uuid,uuid) from public,anon,authenticated;
grant execute on function private.process_assessment_focus(uuid,jsonb,jsonb),private.enforce_assessment_focus(),public.read_assessment_focus(uuid,uuid[]),public.resume_assessment_focus(uuid,uuid,uuid,text),public.read_assessment_ranking(uuid,uuid) to service_role;
commit;
