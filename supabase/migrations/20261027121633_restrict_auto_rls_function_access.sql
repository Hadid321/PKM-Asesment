-- Fungsi event trigger bukan API aplikasi. Pemilik/event trigger tetap berfungsi.
-- Aman pula pada proyek yang tidak memasang helper auto-RLS ini.
begin;
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
commit;
