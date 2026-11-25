-- Allow reuse only as explicitly labelled simulations of a released packet owned by the teacher.
-- Keep the existing transaction, ownership, revision, grading and official-exam checks.
do $migration$
declare original text; revised text;
begin
  select pg_get_functiondef('public.commit_cbt_state(uuid,bigint,jsonb)'::regprocedure) into original;
  revised := replace(original,
    $old$if exists(select 1 from private.cbt_exams e where (e.payload->>'released')::boolean and (e.payload->'fingerprints') ?| array(select jsonb_array_elements_text(data->'fingerprints'))) then raise exception 'CBT_PACKET_EXPOSED'; end if;$old$,
    $new$if data ? 'simulation_source_id' then
      if data->>'title' not like 'Simulasi / Demo · %' or not exists(
        select 1 from private.cbt_exams source
        where source.id=(data->>'simulation_source_id')::uuid
          and source.teacher_id=actor_id
          and source.payload->>'subject'=data->>'subject'
          and source.payload->>'status'='closed'
          and (source.payload->>'released')::boolean
          and source.payload->'fingerprints' = data->'fingerprints'
      ) then raise exception 'CBT_SIMULATION_SOURCE'; end if;
    elsif exists(select 1 from private.cbt_exams e where (e.payload->>'released')::boolean and (e.payload->'fingerprints') ?| array(select jsonb_array_elements_text(data->'fingerprints'))) then raise exception 'CBT_PACKET_EXPOSED'; end if;$new$);
  if revised=original then raise exception 'CBT exposure guard not found'; end if;
  original := revised;
  revised := replace(original,
    $old$e.id<>row_id and e.payload->>'status'='open' and (e.payload->'fingerprints') ?|$old$,
    $new$e.id<>row_id and e.payload->>'status'='open' and not (data ? 'simulation_source_id' and e.payload ? 'simulation_source_id') and (e.payload->'fingerprints') ?|$new$);
  if revised=original then raise exception 'CBT release guard not found'; end if;
  execute revised;
end;
$migration$;
