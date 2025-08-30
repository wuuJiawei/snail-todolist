-- 20250829121001_add_guest_access.sql
-- 添加游客访问权限
-- 此迁移文件为蜗牛待办应用增加游客模式的数据库访问权限

-- 注意: 以下策略允许匿名用户(游客)访问特定表格的数据
-- 但限制匿名用户只能访问和操作他们自己创建的数据

-- 首先添加anonymous_id字段到tasks表
alter table tasks add column if not exists anonymous_id uuid;
comment on column tasks.anonymous_id is '游客创建的任务标识符';

-- 创建索引以提高游客任务查询性能
create index if not exists tasks_anonymous_id_idx on tasks (anonymous_id); 

-- ===== 任务表(tasks)权限 =====
-- 允许匿名用户创建任务
create policy "匿名用户可以创建任务" on tasks
  for insert
  to anon
  with check (true);

-- 允许匿名用户查看自己创建的任务
-- 通过客户端设置任务的anonymous_id字段来标识游客创建的任务
create policy "匿名用户可以查看自己的任务" on tasks
  for select
  to anon
  using (anonymous_id is not null and anonymous_id = (current_setting('request.headers')::json->>'x-anonymous-id')::uuid);

-- 允许匿名用户更新自己创建的任务
create policy "匿名用户可以更新自己的任务" on tasks
  for update
  to anon
  using (anonymous_id is not null and anonymous_id = (current_setting('request.headers')::json->>'x-anonymous-id')::uuid)
  with check (anonymous_id is not null and anonymous_id = (current_setting('request.headers')::json->>'x-anonymous-id')::uuid);

-- 允许匿名用户删除自己创建的任务
create policy "匿名用户可以删除自己的任务" on tasks
  for delete
  to anon
  using (anonymous_id is not null and anonymous_id = (current_setting('request.headers')::json->>'x-anonymous-id')::uuid);

-- ===== 任务标签表(task_tags)权限 =====
-- 允许匿名用户创建任务标签
create policy "匿名用户可以创建任务标签" on task_tags
  for insert
  to anon
  with check (true);

-- 允许匿名用户查看自己创建的任务标签
create policy "匿名用户可以查看自己的任务标签" on task_tags
  for select
  to anon
  using (task_id in (
    select id from tasks where anonymous_id is not null and anonymous_id = (current_setting('request.headers')::json->>'x-anonymous-id')::uuid
  ));

-- 允许匿名用户更新自己创建的任务标签
create policy "匿名用户可以更新自己的任务标签" on task_tags
  for update
  to anon
  using (task_id in (
    select id from tasks where anonymous_id is not null and anonymous_id = (current_setting('request.headers')::json->>'x-anonymous-id')::uuid
  ))
  with check (task_id in (
    select id from tasks where anonymous_id is not null and anonymous_id = (current_setting('request.headers')::json->>'x-anonymous-id')::uuid
  ));

-- 允许匿名用户删除自己创建的任务标签
create policy "匿名用户可以删除自己的任务标签" on task_tags
  for delete
  to anon
  using (task_id in (
    select id from tasks where anonymous_id is not null and anonymous_id = (current_setting('request.headers')::json->>'x-anonymous-id')::uuid
  )); 