import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon-park";
import { cn } from "@/lib/utils";
import AccountSettings from "@/components/settings/AccountSettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import AboutSettings from "@/components/settings/AboutSettings";
import TagSettings from "@/components/settings/TagSettings";
import DataManagementSettings from "@/components/settings/DataManagementSettings";
import { useLocation } from "react-router-dom";

type SettingsTab = "account" | "notifications" | "tags" | "data" | "about";

const Settings = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const location = useLocation();

  // Handle initial tab from location state
  useEffect(() => {
    const state = location.state as { activeTab?: SettingsTab };
    if (state?.activeTab) {
      setActiveTab(state.activeTab);
    }
  }, [location]);

  const tabs = [
    { id: "account", label: "账号", icon: "user" },
    { id: "notifications", label: "通知", icon: "message-one" },
    { id: "tags", label: "标签", icon: "tag-one" },
    { id: "data", label: "数据管理", icon: "data" },
    { id: "about", label: "关于", icon: "info" },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Settings sidebar */}
      <div className="w-64 border-r h-full overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
        <div className="p-4">
          <h2 className="text-lg font-medium mb-4">设置</h2>
          <div className="space-y-1">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  activeTab === tab.id && "bg-gray-200 dark:bg-gray-700"
                )}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
              >
                <Icon icon={tab.icon} className="mr-2 h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {activeTab === "account" && <AccountSettings />}
        {activeTab === "notifications" && <NotificationSettings />}
        {activeTab === "tags" && <TagSettings />}
        {activeTab === "data" && <DataManagementSettings />}
        {activeTab === "about" && <AboutSettings />}
      </div>
    </div>
  );
};

export default Settings;
