import { AppVersion } from '@/types/app';

/**
 * 获取应用版本信息
 */
export function getAppVersion(): AppVersion {
  return {
    version: __APP_VERSION__ || '0.0.0',
    buildTime: __BUILD_TIME__,
  };
}

/**
 * 格式化版本显示
 */
export function formatVersion(version: AppVersion): string {
  return version.version;
}

/**
 * 格式化构建时间
 */
export function formatBuildTime(version: AppVersion): string | undefined {
  if (!version.buildTime) return undefined;
  
  try {
    const buildDate = new Date(version.buildTime);
    return buildDate.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return undefined;
  }
}