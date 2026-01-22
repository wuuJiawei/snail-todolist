import React from "react";
import { WifiOff, MessageCircle } from "lucide-react";
import { isOfflineMode, isOnlineMode } from "@/config/storage";

const Chat: React.FC = () => {
  if (isOfflineMode) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <WifiOff className="h-16 w-16" />
        <h2 className="text-xl font-semibold">聊天功能不可用</h2>
        <p className="text-sm">离线模式下无法使用聊天功能</p>
      </div>
    );
  }

  if (isOnlineMode) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <MessageCircle className="h-16 w-16" />
        <h2 className="text-xl font-semibold">聊天功能开发中</h2>
        <p className="text-sm">全局聊天功能正在开发中，敬请期待</p>
      </div>
    );
  }

  return null;
};

export default Chat;
