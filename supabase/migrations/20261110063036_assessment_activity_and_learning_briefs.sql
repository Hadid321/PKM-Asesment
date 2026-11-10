begin;
create table private.assessment_events(
 id uuid primary key,sitting_id uuid not null references private.cbt_sittings(id) on delete restrict,
 kind text not null check(kind in ('opened','hidden','visible','blur','focus','offline','online','fullscreen_exit','left_assessment')),
 received_at timestamptz not null default clock_timestamp()
);
create index assessment_events_sitting_time on private.assessment_events(sitting_id,received_at desc);
create table private.assessment_presence(
 sitting_id uuid primary key references private.cbt_sittings(id) on delete restrict,
 last_seen timestamptz not null,visible boolean not null,focused boolean not null,
 online boolean not null,fullscreen boolean not null
);
create table private.assessment_briefs(
 target_id uuid not null,kind text not null check(kind in ('student','teacher')),
 owner_id uuid not null references public.profiles(id) on delete restrict,
 status text not null check(status in ('pending','ready')),claim_id uuid not null,
 claimed_at timestamptz not null,brief jsonb,source text check(source in ('groq','template')),
 primary key(target_id,kind)
);
create index assessment_briefs_owner on private.assessment_briefs(owner_id);
alter table private.assessment_events enable row level security;
alter table private.assessment_presence enable row level security;
alter table private.assessment_briefs enable row level security;
revoke all on private.assessment_events,private.assessment_presence,private.assessment_briefs from public,anon,authenticated;
grant select,insert,update on private.assessment_events,private.assessment_presence,private.assessment_briefs to service_role;

create function public.record_assessment_activity(actor_id uuid,sitting_id uuid,events jsonb,presence jsonb) returns boolean
language plpgsql security invoker set search_path='' as $$
declare s private.cbt_sittings; e jsonb; old private.assessment_events; event_count integer;
begin
 select * into s from private.cbt_sittings where id=sitting_id for update;
 if s.id is null or s.student_id<>actor_id or not exists(select 1 from public.class_members m join private.cbt_exams x on x.class_id=m.class_id where x.id=s.exam_id and m.student_id=actor_id) then raise exception 'Activity forbidden'; end if;
 if s.payload->>'status'<>'active' or (s.payload->>'deadline_at')::timestamptz<=clock_timestamp() or exists(select 1 from private.cbt_exams x where x.id=s.exam_id and x.payload->>'status'<>'open') then return false; end if;
 if jsonb_typeof(events)<>'array' or jsonb_array_length(events)>20 or jsonb_typeof(presence)<>'object' then raise exception 'Invalid activity'; end if;
 -- Row lock serializes retries and the event cap without touching answer versions.
 select count(*) into event_count from private.assessment_events a where a.sitting_id=record_assessment_activity.sitting_id;
 for e in select * from jsonb_array_elements(events) loop
  if e->>'kind' not in ('opened','hidden','visible','blur','focus','offline','online','fullscreen_exit','left_assessment') or e->>'id' is null then raise exception 'Invalid activity kind'; end if;
  select * into old from private.assessment_events where id=(e->>'id')::uuid;
  if old.id is not null then
   if old.sitting_id<>sitting_id or old.kind<>e->>'kind' then raise exception 'Activity ID reused'; end if;
  elsif event_count<1000 then
   insert into private.assessment_events(id,sitting_id,kind) values((e->>'id')::uuid,sitting_id,e->>'kind');
   event_count:=event_count+1;
  end if;
 end loop;
 insert into private.assessment_presence values(sitting_id,clock_timestamp(),(presence->>'visible')::boolean,(presence->>'focused')::boolean,(presence->>'online')::boolean,(presence->>'fullscreen')::boolean)
 on conflict on constraint assessment_presence_pkey do update set last_seen=excluded.last_seen,visible=excluded.visible,focused=excluded.focused,online=excluded.online,fullscreen=excluded.fullscreen;
 return true;
end;$$;

create function public.read_assessment_monitor(actor_id uuid) returns jsonb
language sql security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'sitting_id',p.sitting_id,'last_seen',p.last_seen,'visible',p.visible,'focused',p.focused,'online',p.online,'fullscreen',p.fullscreen,
 'left_count',(select count(*) from private.assessment_events a where a.sitting_id=s.id and a.kind='left_assessment'),
 'hidden_count',(select count(*) from private.assessment_events a where a.sitting_id=s.id and a.kind='hidden'),
 'blur_count',(select count(*) from private.assessment_events a where a.sitting_id=s.id and a.kind='blur'),
 'fullscreen_exits',(select count(*) from private.assessment_events a where a.sitting_id=s.id and a.kind='fullscreen_exit'),
 'offline_count',(select count(*) from private.assessment_events a where a.sitting_id=s.id and a.kind='offline'),
 'recent',(select coalesce(jsonb_agg(v),'[]'::jsonb) from (select kind,received_at from private.assessment_events a where a.sitting_id=s.id order by received_at desc,id desc limit 10) v)
 )),'[]'::jsonb)
 from private.cbt_sittings s join private.cbt_exams x on x.id=s.exam_id
 join public.classes c on c.id=x.class_id join private.assessment_presence p on p.sitting_id=s.id
 where x.teacher_id=actor_id and c.teacher_id=actor_id;
$$;

create function public.claim_assessment_brief(actor_id uuid,target_id uuid,kind text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r private.assessment_briefs; can_read boolean;
begin
 if kind='student' then
  select exists(select 1 from private.cbt_sittings s join private.cbt_exams x on x.id=s.exam_id where s.id=target_id and s.student_id=actor_id and s.payload->>'status'='submitted' and (x.payload->>'released')::boolean) into can_read;
 elsif kind='teacher' then
  select exists(select 1 from private.cbt_exams x join public.classes c on c.id=x.class_id where x.id=target_id and x.teacher_id=actor_id and c.teacher_id=actor_id and x.payload->>'status'='closed') into can_read;
 end if;
 if not coalesce(can_read,false) then raise exception 'Brief forbidden'; end if;
 insert into private.assessment_briefs values(target_id,kind,actor_id,'pending',gen_random_uuid(),clock_timestamp(),null,null) on conflict do nothing;
 select * into r from private.assessment_briefs b where b.target_id=claim_assessment_brief.target_id and b.kind=claim_assessment_brief.kind for update;
 if r.owner_id<>actor_id then raise exception 'Brief forbidden'; end if;
 if r.status='ready' then return jsonb_build_object('status','ready','brief',r.brief,'source',r.source); end if;
 if r.claimed_at<clock_timestamp()-interval '90 seconds' then
  update private.assessment_briefs b set claim_id=gen_random_uuid(),claimed_at=clock_timestamp(),brief=null where b.target_id=r.target_id and b.kind=r.kind returning * into r;
 end if;
 -- A fresh claim is handed out once, by turning its timestamp marker into a lease.
 if r.brief is null then
  update private.assessment_briefs b set brief='{}'::jsonb where b.target_id=r.target_id and b.kind=r.kind;
  return jsonb_build_object('status','claimed','claim_id',r.claim_id);
 end if;
 return jsonb_build_object('status','pending');
end;$$;
create function public.complete_assessment_brief(actor_id uuid,target_id uuid,kind text,claim_id uuid,brief jsonb,source text) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
 if jsonb_typeof(brief)<>'object' or octet_length(brief::text)>12000 or source not in ('groq','template') then raise exception 'Invalid brief'; end if;
 update private.assessment_briefs b set status='ready',brief=complete_assessment_brief.brief,source=complete_assessment_brief.source
 where b.target_id=complete_assessment_brief.target_id and b.kind=complete_assessment_brief.kind and b.owner_id=actor_id and b.claim_id=complete_assessment_brief.claim_id and b.status='pending';
 return found;
end;$$;
revoke all on function public.record_assessment_activity(uuid,uuid,jsonb,jsonb),public.read_assessment_monitor(uuid),public.claim_assessment_brief(uuid,uuid,text),public.complete_assessment_brief(uuid,uuid,text,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.record_assessment_activity(uuid,uuid,jsonb,jsonb),public.read_assessment_monitor(uuid),public.claim_assessment_brief(uuid,uuid,text),public.complete_assessment_brief(uuid,uuid,text,uuid,jsonb,text) to service_role;
commit;
