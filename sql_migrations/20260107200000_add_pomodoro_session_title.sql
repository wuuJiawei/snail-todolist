-- migration: add title column to pomodoro_sessions table
-- purpose : allow users to set a focus title for each pomodoro session
-- affects : table public.pomodoro_sessions
-- notes   : safe to run multiple times (uses IF NOT EXISTS pattern)

-- add title column if it doesn't exist
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pomodoro_sessions'
      and column_name = 'title'
  ) then
    alter table public.pomodoro_sessions
      add column title text null;
    
    comment on column public.pomodoro_sessions.title is
      'Optional focus title describing what the user is working on during this session.';
  end if;
end $$;
