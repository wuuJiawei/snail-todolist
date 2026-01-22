
import { useEffect } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { isOfflineMode } from "@/storage";
import { useUserProfileStore } from "@/store/userProfileStore";
import * as storageOps from "@/storage/operations";

const UserMenu = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const userProfile = useUserProfileStore((state) => state.profile);
  const setUserProfile = useUserProfileStore((state) => state.setProfile);

  // Load user profile on mount and when user changes
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await storageOps.getUserProfile();
        if (profile) {
          setUserProfile({
            username: profile.username || (isOfflineMode ? "离线用户" : ""),
            avatarUrl: profile.avatar_url || null,
          });
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    };

    loadProfile();
  }, [setUserProfile, user?.id]);

  const getUserInitials = () => {
    if (isOfflineMode) {
      return userProfile.username.charAt(0).toUpperCase() || "离";
    }
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

  // Offline mode: show simplified menu with custom avatar
  if (isOfflineMode) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10 border">
              {userProfile.avatarUrl ? (
                <AvatarImage src={userProfile.avatarUrl} alt="用户头像" />
              ) : null}
              <AvatarFallback className="bg-brand-orange/10 text-brand-orange">
                {userProfile.avatarUrl ? null : (
                  <Icon icon="snail" size={20} className="text-brand-orange" />
                )}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start" forceMount>
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none flex items-center gap-2">
                <Icon icon="snail" size={16} className="text-brand-orange" />
                {userProfile.username}
              </p>
              <p className="text-xs leading-none text-gray-500">离线模式 · 数据存储在本地</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/settings', { state: { activeTab: 'account' } })}>
            <Icon icon="user" size="16" className="mr-2 h-4 w-4" />
            <span>账号设置</span>
          </DropdownMenuItem>
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
