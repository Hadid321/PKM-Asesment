-- Read-only. Jalankan untuk memeriksa kesiapan pembaruan pada proyek yang tepat.
select current_database() as database_name;
select column_name,data_type,is_nullable,column_default
from information_schema.columns
where table_schema='public' and table_name='topics'
order by ordinal_position;
select tablename,policyname,roles,cmd,qual,with_check
from pg_policies where schemaname='public' and tablename in ('questions','topics','quiz_sessions');
select routine_name,grantee,privilege_type from information_schema.routine_privileges
where routine_schema='public' and routine_name in ('read_assessment_state','commit_assessment_state','join_assessment_class');
select tgname from pg_trigger where not tgisinternal and tgname in ('sessions_teacher_bank','topics_classification_fixed','prerequisites_same_subject');
