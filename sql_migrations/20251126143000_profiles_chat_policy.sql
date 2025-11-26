-- 20251126143000_profiles_chat_policy.sql
-- 允许读取参与全局聊天室的用户的 profiles（仅限 authenticated）

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_chat_participants" on public.profiles;
create policy "profiles_select_chat_participants"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.global_chat_messages g
    where g.user_id = profiles.id
  )
);
