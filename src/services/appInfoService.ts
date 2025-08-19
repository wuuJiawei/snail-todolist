import { supabase } from '@/integrations/supabase/client';
import { AppInfo } from '@/types/app';

/**
 * 获取应用信息
 */
export async function getAppInfo(): Promise<AppInfo | null> {
  try {
    const { data, error } = await supabase
      .from('app_info')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('获取应用信息失败:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('获取应用信息时发生错误:', error);
    return null;
  }
}

/**
 * 更新应用信息（管理员功能）
 */
export async function updateAppInfo(appInfo: Partial<AppInfo>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('app_info')
      .update(appInfo)
      .eq('id', 1); // 假设只有一条应用信息记录

    if (error) {
      console.error('更新应用信息失败:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('更新应用信息时发生错误:', error);
    return false;
  }
}