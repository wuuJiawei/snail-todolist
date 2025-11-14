-- 20251121100000_create_global_chat_messages.sql
-- 全局聊天室：消息表、RLS 策略与 Realtime 发布

set check_function_bodies = off;

-- 表结构
create table if not exists public.global_chat_messages (
  id uuid primary key default gen_random_uuid(),
  content text not null check (char_length(trim(content)) > 0),
  author_name text,
  user_id uuid null,
  anonymous_id uuid null,
  created_at timestamptz not null default now(),
  constraint global_chat_messages_actor_xor
    check ((user_id is null) <> (anonymous_id is null))
);

-- 外键，仅当不存在时添加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'global_chat_messages_user_id_fkey'
  ) THEN
    ALTER TABLE public.global_chat_messages
      ADD CONSTRAINT global_chat_messages_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users (id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

-- 索引
create index if not exists global_chat_messages_created_at_idx
  on public.global_chat_messages (created_at desc);

create index if not exists global_chat_messages_user_id_idx
  on public.global_chat_messages (user_id);

create index if not exists global_chat_messages_anonymous_id_idx
  on public.global_chat_messages (anonymous_id);

-- 启用 RLS
alter table public.global_chat_messages enable row level security;

-- 读取策略：任何人（游客/登录）可读
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'global_chat_messages'
      AND policyname = 'global_chat_messages_select_anon'
  ) THEN
    CREATE POLICY global_chat_messages_select_anon
      ON public.global_chat_messages
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'global_chat_messages'
      AND policyname = 'global_chat_messages_select_auth'
  ) THEN
    CREATE POLICY global_chat_messages_select_auth
      ON public.global_chat_messages
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 插入策略：游客/登录分别校验身份
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'global_chat_messages'
      AND policyname = 'global_chat_messages_insert_anon'
  ) THEN
    CREATE POLICY global_chat_messages_insert_anon
      ON public.global_chat_messages
      FOR INSERT
      TO anon
      WITH CHECK (
        anonymous_id is not null
        AND anonymous_id = (current_setting('request.headers')::json->>'x-anonymous-id')::uuid
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'global_chat_messages'
      AND policyname = 'global_chat_messages_insert_auth'
  ) THEN
    CREATE POLICY global_chat_messages_insert_auth
      ON public.global_chat_messages
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 不提供更新/删除策略，默认拒绝（仅服务角色可操作）

-- 将表加入 Realtime 发布（若存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.global_chat_messages';
  END IF;
END $$;
