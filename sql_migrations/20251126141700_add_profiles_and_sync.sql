-- 20251126141700_add_profiles_and_sync.sql
-- 创建 public.profiles 表，用于展示昵称/邮箱/头像；
-- 从 auth.users 同步（INSERT/UPDATE 触发器）；
-- 配置 RLS 策略（仅自身、同清单成员互相、成员查看拥有者、拥有者查看成员）；
-- 从 auth.users 回填初始化数据；
-- （可选）为 project_members.user_id 添加外键到 profiles(id)。

-- 1) 表结构与基础设施 --------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_email on public.profiles(email);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

-- 2) 启用 RLS 与精细化可读策略 ----------------------------------------------
alter table public.profiles enable row level security;

-- 自身可读
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- 同一清单成员互相可读
drop policy if exists "profiles_select_project_members" on public.profiles;
create policy "profiles_select_project_members"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.project_members m1
    join public.project_members m2 on m1.project_id = m2.project_id
    where m1.user_id = auth.uid()
      and m2.user_id = profiles.id
  )
);

-- 成员可查看清单拥有者
drop policy if exists "profiles_select_project_owners" on public.profiles;
create policy "profiles_select_project_owners"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    join public.project_members m on m.project_id = p.id
    where m.user_id = auth.uid()
      and p.user_id = profiles.id
  )
);

-- 拥有者可查看清单成员
drop policy if exists "profiles_select_members_by_owner" on public.profiles;
create policy "profiles_select_members_by_owner"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    join public.project_members m on m.project_id = p.id
    where p.user_id = auth.uid()
      and m.user_id = profiles.id
  )
);

-- 3) 回填初始化数据 -----------------------------------------------------------
insert into public.profiles (id, email, display_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'preferred_username', u.raw_user_meta_data->>'user_name', u.email),
  coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
on conflict (id) do nothing;

-- 4) users → profiles 同步触发器 ---------------------------------------------
create or replace function public.upsert_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'preferred_username', new.raw_user_meta_data->>'user_name', new.email),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    now(), now()
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.upsert_profile_from_auth();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update on auth.users
for each row execute procedure public.upsert_profile_from_auth();

-- 5) （可选）外键：project_members.user_id → profiles(id) --------------------
create index if not exists idx_project_members_user_id on public.project_members(user_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'project_members_user_id_fkey'
  ) then
    alter table public.project_members
      add constraint project_members_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade not valid;
    alter table public.project_members validate constraint project_members_user_id_fkey;
  end if;
end $$;
