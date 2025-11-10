-- purpose: record per-task activity timeline entries for audits & UI timeline.
-- usage: run inside Supabase SQL editor or via migration tooling.

create extension if not exists pgcrypto;

create table if not exists public.task_activities (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  anonymous_id uuid null,
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.task_activities is 'Timeline entries describing mutations performed on tasks.';
comment on column public.task_activities.action is 'Machine-readable action key (e.g. title_updated, tag_added).';
comment on column public.task_activities.metadata is 'Structured JSON payload describing the change (old/new values, counts, etc).';

create index if not exists task_activities_task_idx on public.task_activities (task_id, created_at desc);
create index if not exists task_activities_user_idx on public.task_activities (user_id);
create index if not exists task_activities_anonymous_idx on public.task_activities (anonymous_id);

alter table public.task_activities enable row level security;

-- Authenticated users: allow CRUD when they own the underlying task (direct owner or project membership).
drop policy if exists "task_activities_select_owner" on public.task_activities;
create policy "task_activities_select_owner"
  on public.task_activities for select to authenticated
  using (
    exists (
      select 1
      from public.tasks t
      left join public.project_members pm on pm.project_id = t.project
      where t.id = task_activities.task_id
        and (t.user_id = auth.uid() or pm.user_id = auth.uid())
    )
  );

drop policy if exists "task_activities_insert_owner" on public.task_activities;
create policy "task_activities_insert_owner"
  on public.task_activities for insert to authenticated
  with check (
    exists (
      select 1
      from public.tasks t
      left join public.project_members pm on pm.project_id = t.project
      where t.id = task_activities.task_id
        and (t.user_id = auth.uid() or pm.user_id = auth.uid())
    )
  );

-- Guests identified via anonymous_id header
drop policy if exists "task_activities_select_guest" on public.task_activities;
create policy "task_activities_select_guest"
  on public.task_activities for select to anon
  using (
    anonymous_id is not null
    and anonymous_id::text = (current_setting('request.headers')::json->>'x-anonymous-id')
  );

drop policy if exists "task_activities_insert_guest" on public.task_activities;
create policy "task_activities_insert_guest"
  on public.task_activities for insert to anon
  with check (
    anonymous_id is not null
    and anonymous_id::text = (current_setting('request.headers')::json->>'x-anonymous-id')
  );
