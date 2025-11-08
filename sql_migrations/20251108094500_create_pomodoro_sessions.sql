-- migration: create pomodoro_sessions table with user-scoped access policies
-- purpose : persist pomodoro timer sessions per user, including focus/short/long breaks
-- affects : table public.pomodoro_sessions, dependent indexes & rls policies
-- notes   : enables rls and enforces per-user access; safe to run multiple times

set check_function_bodies = off;

-- drop existing table when running in a reset scenario
drop table if exists public.pomodoro_sessions cascade;

-- recreate table structure
create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  start_time timestamptz not null default now(),
  end_time timestamptz null,
  duration integer not null,
  type text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint pomodoro_sessions_type_check
    check (type in ('focus', 'short_break', 'long_break'))
);

comment on table public.pomodoro_sessions is
  'Stores user-specific pomodoro sessions (focus, short break, long break).';

comment on column public.pomodoro_sessions.duration is
  'Planned duration of the session in minutes.';

comment on column public.pomodoro_sessions.completed is
  'Marks whether the session completed successfully (true) or was cancelled (false).';

-- ensure foreign key to auth.users (requires supabase config)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pomodoro_sessions_user_id_fkey'
  ) then
    alter table public.pomodoro_sessions
      add constraint pomodoro_sessions_user_id_fkey
      foreign key (user_id)
      references auth.users (id)
      on delete cascade
      on update cascade;
  end if;
end $$;

-- helpful indexes for lookups
create index if not exists pomodoro_sessions_user_start_idx
  on public.pomodoro_sessions (user_id, start_time desc);

create index if not exists pomodoro_sessions_user_completed_idx
  on public.pomodoro_sessions (user_id, completed, start_time desc);

-- enable row level security and define per-user policies
alter table public.pomodoro_sessions enable row level security;

-- policy: allow authenticated users to select only their own sessions
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pomodoro_sessions'
      and policyname = 'pomodoro_sessions_select_own'
  ) then
    create policy pomodoro_sessions_select_own
      on public.pomodoro_sessions
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

-- policy: allow authenticated users to insert sessions for themselves
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pomodoro_sessions'
      and policyname = 'pomodoro_sessions_insert_own'
  ) then
    create policy pomodoro_sessions_insert_own
      on public.pomodoro_sessions
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;
end $$;

-- policy: allow authenticated users to update their own sessions
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pomodoro_sessions'
      and policyname = 'pomodoro_sessions_update_own'
  ) then
    create policy pomodoro_sessions_update_own
      on public.pomodoro_sessions
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

-- optional: allow users to delete their own sessions (for history management)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pomodoro_sessions'
      and policyname = 'pomodoro_sessions_delete_own'
  ) then
    create policy pomodoro_sessions_delete_own
      on public.pomodoro_sessions
      for delete
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

-- grant minimal rights; rely on policies
grant usage on schema public to authenticated;
grant all privileges on table public.pomodoro_sessions to authenticated;


