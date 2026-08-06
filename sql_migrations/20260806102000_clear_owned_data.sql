-- Atomically clears data owned by the authenticated user for replace imports.
create or replace function public.clear_owned_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  delete from public.task_tags
  where task_id in (
    select id from public.tasks
    where user_id = current_user_id
       or project in (select id from public.projects where user_id = current_user_id)
  )
     or tag_id in (select id from public.tags where user_id = current_user_id);

  delete from public.tasks
  where user_id = current_user_id
     or project in (select id from public.projects where user_id = current_user_id);
  delete from public.tags where user_id = current_user_id;
  delete from public.projects where user_id = current_user_id;
end;
$$;

revoke all on function public.clear_owned_data() from public, anon;
grant execute on function public.clear_owned_data() to authenticated;
