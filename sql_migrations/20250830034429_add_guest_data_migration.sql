-- 20250830034429_add_guest_data_migration.sql
-- 添加游客数据迁移功能
-- 此迁移文件创建一个存储过程，用于将游客创建的数据迁移到正式用户账户

-- 创建存储过程用于迁移游客数据到正式用户
CREATE OR REPLACE FUNCTION public.migrate_guest_data(p_guest_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_id uuid;
BEGIN
  -- 检查参数
  IF p_guest_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'Guest ID and User ID are required';
  END IF;

  -- 检查用户ID是否存在
  PERFORM id FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User ID does not exist: %', p_user_id;
  END IF;
  
  -- 开始事务
  BEGIN
    -- 更新任务表中的记录，将游客ID关联到用户ID
    UPDATE public.tasks
    SET 
      user_id = p_user_id,
      anonymous_id = NULL,
      updated_at = NOW()
    WHERE 
      anonymous_id = p_guest_id AND
      user_id IS NULL;
      
    -- 日志记录迁移操作
    INSERT INTO public.data_migration_logs (
      guest_id, 
      user_id, 
      migration_date, 
      migration_type
    ) VALUES (
      p_guest_id,
      p_user_id,
      NOW(),
      'guest_to_user'
    );
    
    -- 提交事务
    COMMIT;
  EXCEPTION WHEN OTHERS THEN
    -- 回滚事务
    ROLLBACK;
    RAISE;
  END;
END;
$$;

-- 创建数据迁移日志表
CREATE TABLE IF NOT EXISTS public.data_migration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL,
  user_id uuid NOT NULL,
  migration_date timestamp with time zone NOT NULL DEFAULT NOW(),
  migration_type text NOT NULL,
  details jsonb NULL
);

-- 添加注释
COMMENT ON FUNCTION public.migrate_guest_data IS '将游客数据迁移到正式用户账户';
COMMENT ON TABLE public.data_migration_logs IS '数据迁移日志记录';

-- 设置RLS策略
ALTER TABLE public.data_migration_logs ENABLE ROW LEVEL SECURITY;

-- 只有管理员和系统可以访问迁移日志
CREATE POLICY "管理员可以访问迁移日志" ON public.data_migration_logs
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE is_admin = true)); 