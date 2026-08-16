-- Purpose: extend the existing task date into date, datetime, and time-range modes.
-- Impact: public.tasks gains date_type and end_date; existing date values are preserved.
-- Security: no new table or policy is introduced; existing tasks RLS policies continue to apply.

begin;

alter table public.tasks
  add column if not exists date_type text not null default 'date';

do $$
declare
  existing_date_type text;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tasks'
      and column_name = 'end_date'
  ) then
    select format_type(attribute.atttypid, attribute.atttypmod)
      into existing_date_type
    from pg_attribute attribute
    join pg_class relation on relation.oid = attribute.attrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'tasks'
      and attribute.attname = 'date'
      and attribute.attnum > 0
      and not attribute.attisdropped;

    if existing_date_type is null then
      raise exception 'public.tasks.date does not exist';
    end if;

    execute format('alter table public.tasks add column end_date %s null', existing_date_type);
  end if;
end $$;

update public.tasks
set date_type = 'date'
where date_type is null or date_type not in ('date', 'datetime', 'range');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_date_type_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_date_type_check
      check (date_type in ('date', 'datetime', 'range'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_date_value_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_date_value_check
      check (
        (date is null and end_date is null and date_type = 'date')
        or (date is not null and date_type in ('date', 'datetime') and end_date is null)
        or (date is not null and date_type = 'range' and end_date is not null and end_date > date)
      );
  end if;
end $$;

create index if not exists idx_tasks_calendar_date
  on public.tasks (date)
  where deleted = false and abandoned = false and date is not null;

comment on column public.tasks.date_type is 'Task date mode: date, datetime, or range.';
comment on column public.tasks.end_date is 'End timestamp for range tasks; null for date and datetime tasks.';

commit;
