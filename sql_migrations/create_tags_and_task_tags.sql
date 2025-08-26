-- purpose: introduce user-scoped plain-text tags and the task_tags join table
-- usage: run in supabase sql editor if not using cli migrations. this file mirrors the
--        official migration under supabase/migrations and is provided for reference/execution.

create extension if not exists pgcrypto;

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.tags is 'user-scoped tag catalog (text only). optional project scope via project_id.';
comment on column public.tags.name is 'tag name, plain text, unique per user and project scope.';
comment on column public.tags.user_id is 'owner (auth.users.id).';
comment on column public.tags.project_id is 'optional project scope. null means global tag for the user.';

create unique index if not exists tags_unique_user_scope_name
  on public.tags (user_id, (coalesce(project_id::text, 'global')), name);
create index if not exists tags_user_idx on public.tags (user_id);
create index if not exists tags_project_idx on public.tags (project_id);

alter table public.tags enable row level security;

-- Drop policies if they exist and recreate them
drop policy if exists "tags_select_authenticated_owner" on public.tags;
create policy "tags_select_authenticated_owner"
  on public.tags for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "tags_insert_authenticated_owner" on public.tags;
create policy "tags_insert_authenticated_owner"
  on public.tags for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "tags_update_authenticated_owner" on public.tags;
create policy "tags_update_authenticated_owner"
  on public.tags for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "tags_delete_authenticated_owner" on public.tags;
create policy "tags_delete_authenticated_owner"
  on public.tags for delete to authenticated
  using (user_id = auth.uid());

create table if not exists public.task_tags (
  task_id uuid not null references public.tasks(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, tag_id)
);

comment on table public.task_tags is 'join table mapping tasks to tags (many-to-many).';

create index if not exists task_tags_task_idx on public.task_tags (task_id);
create index if not exists task_tags_tag_idx on public.task_tags (tag_id);

alter table public.task_tags enable row level security;

drop policy if exists "task_tags_select_authenticated_owner" on public.task_tags;
create policy "task_tags_select_authenticated_owner"
  on public.task_tags for select to authenticated
  using (
    exists (
      select 1
      from public.tasks t
      join public.tags g on g.id = task_tags.tag_id
      where t.id = task_tags.task_id
        and t.user_id = auth.uid()
        and g.user_id = auth.uid()
    )
  );

drop policy if exists "task_tags_insert_authenticated_owner" on public.task_tags;
create policy "task_tags_insert_authenticated_owner"
  on public.task_tags for insert to authenticated
  with check (
    exists (
      select 1
      from public.tasks t
      join public.tags g on g.id = task_tags.tag_id
      where t.id = task_tags.task_id
        and t.user_id = auth.uid()
        and g.user_id = auth.uid()
    )
  );

drop policy if exists "task_tags_update_authenticated_owner" on public.task_tags;
create policy "task_tags_update_authenticated_owner"
  on public.task_tags for update to authenticated
  using (
    exists (
      select 1
      from public.tasks t
      join public.tags g on g.id = task_tags.tag_id
      where t.id = task_tags.task_id
        and t.user_id = auth.uid()
        and g.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tasks t
      join public.tags g on g.id = task_tags.tag_id
      where t.id = task_tags.task_id
        and t.user_id = auth.uid()
        and g.user_id = auth.uid()
    )
  );

drop policy if exists "task_tags_delete_authenticated_owner" on public.task_tags;
create policy "task_tags_delete_authenticated_owner"
  on public.task_tags for delete to authenticated
  using (
    exists (
      select 1
      from public.tasks t
      join public.tags g on g.id = task_tags.tag_id
      where t.id = task_tags.task_id
        and t.user_id = auth.uid()
        and g.user_id = auth.uid()
    )
  );
