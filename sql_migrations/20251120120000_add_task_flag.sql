-- purpose: add a per-task flag for highlighting important tasks across lists.
-- usage: run inside Supabase SQL editor or via migration tooling.

alter table if exists public.tasks
  add column if not exists flagged boolean not null default false;

comment on column public.tasks.flagged is 'Indicates whether the task is flagged/pinned by the user.';
