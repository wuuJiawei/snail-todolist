export interface AppInfo {
  id: number;
  app_name: string;
  app_description: string;
  app_logo_url?: string;
  developer_name: string;
  contact_email: string;
  contact_website?: string;
  features: string[];
  created_at: string;
  updated_at: string;
}

export interface AppVersion {
  version: string;
  buildTime?: string;
  gitCommit?: string;
}

export interface AboutData {
  appInfo: AppInfo;
  version: AppVersion;
}