
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon-park";
// Keep lucide-react as fallback
import { LogOut, User, WifiOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { isOfflineMode } from "@/storage";

const UserMenu = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const getUserInitials = () => {
    if (isOfflineMode) return "离";
    if (!user) return "U";

    const email = user.email || "";
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }

    return "U";
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Offline mode: show simplified menu
  if (isOfflineMode) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10 border">
              <AvatarFallback className="bg-amber-100 text-amber-700">
                <WifiOff className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start" forceMount>
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-amber-600" />
                离线模式
              </p>
              <p className="text-xs leading-none text-gray-500">数据存储在本地</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <Icon icon="setting-two" size="16" className="mr-2 h-4 w-4" />
            <span>设置</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={user?.user_metadata?.avatar_url || ""} alt="用户头像" />
            <AvatarFallback>{getUserInitials()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" forceMount>
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.user_metadata?.name || user?.email}</p>
            <p className="text-xs leading-none text-gray-500">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/settings', { state: { activeTab: 'account' } })}>
          <Icon icon="user" size="16" className="mr-2 h-4 w-4" />
          <span>账号设置</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut}>
          <Icon icon="logout" size="16" className="mr-2 h-4 w-4" />
          <span>退出登录</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
