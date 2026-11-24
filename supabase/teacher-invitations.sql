-- Apply once in the school database before deploying the feature.
begin;
create table public.school_admins (
  user_id uuid primary key references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create table public.teacher_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(btrim(email)) and char_length(email) between 3 and 254),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  revoked_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by uuid references public.profiles(id) on delete restrict,
  check ((redeemed_at is null) = (redeemed_by is null)),
  check (revoked_at is null or redeemed_at is null)
);
create table public.teacher_access_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  invitation_id uuid not null references public.teacher_invitations(id) on delete restrict,
  action text not null check (action in ('issue','revoke','redeem')),
  created_at timestamptz not null default now()
);
alter table public.school_admins enable row level security;
alter table public.teacher_invitations enable row level security;
alter table public.teacher_access_logs enable row level security;
revoke all on public.school_admins, public.teacher_invitations, public.teacher_access_logs from public, anon, authenticated;
grant select on public.school_admins, public.teacher_invitations, public.teacher_access_logs to service_role;
grant insert, update on public.teacher_invitations to service_role;
grant insert on public.teacher_access_logs to service_role;

-- Server-only RPCs: actor UUID and verified email come from auth.getUser(), not request body.
create function public.issue_teacher_invitation(p_actor uuid, p_email text, p_hash text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid;
begin
  if not exists(select 1 from public.school_admins where user_id=p_actor) then
    raise exception 'not allowed' using errcode='42501';
  end if;
  insert into public.teacher_invitations(email,code_hash,created_by)
    values(p_email,p_hash,p_actor) returning id into v_id;
  insert into public.teacher_access_logs(actor_id,invitation_id,action) values(p_actor,v_id,'issue');
  return v_id;
end;
$$;
create function public.revoke_teacher_invitation(p_actor uuid, p_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from public.school_admins where user_id=p_actor) then
    raise exception 'not allowed' using errcode='42501';
  end if;
  update public.teacher_invitations set revoked_at=now()
    where id=p_id and redeemed_at is null and revoked_at is null;
  if not found then return false; end if;
  insert into public.teacher_access_logs(actor_id,invitation_id,action) values(p_actor,p_id,'revoke');
  return true;
end;
$$;
create function public.redeem_teacher_invitation(p_actor uuid, p_email text, p_hash text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_role text;
begin
  select role into v_role from public.profiles where id=p_actor for update;
  if v_role is distinct from 'student' then return false; end if;
  update public.teacher_invitations set redeemed_at=now(), redeemed_by=p_actor
    where email=p_email and code_hash=p_hash and revoked_at is null
      and redeemed_at is null and expires_at>now()
    returning id into v_id;
  if not found then return false; end if;
  update public.profiles set role='teacher' where id=p_actor and role='student';
  if not found then raise exception 'profile changed'; end if;
  insert into public.teacher_access_logs(actor_id,invitation_id,action) values(p_actor,v_id,'redeem');
  return true;
end;
$$;
revoke all on function public.issue_teacher_invitation(uuid,text,text), public.revoke_teacher_invitation(uuid,uuid), public.redeem_teacher_invitation(uuid,text,text) from public, anon, authenticated;
grant execute on function public.issue_teacher_invitation(uuid,text,text), public.revoke_teacher_invitation(uuid,uuid), public.redeem_teacher_invitation(uuid,text,text) to service_role;
commit;
