import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { isOfflineMode } from "@/storage";
import { useUserProfileStore } from "@/store/userProfileStore";
import * as storageOps from "@/storage/operations";

const AccountSettings = () => {
  const { user, refreshUser } = useAuth();
  const setUserProfile = useUserProfileStore((state) => state.setProfile);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const profile = await storageOps.getUserProfile();
      if (profile) {
        setUsername(profile.username || (isOfflineMode ? "离线用户" : ""));
        setAvatarUrl(profile.avatar_url || "");
      } else if (!isOfflineMode && user) {
        setUsername(user.user_metadata?.name || "");
        setAvatarUrl(user.user_metadata?.avatar_url || "");
      }
    };

    loadProfile();
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);

      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate file size (max 2MB)
      if (avatarFile) {
        const fileSizeInMB = avatarFile.size / (1024 * 1024);
        if (fileSizeInMB > 2) {
          throw new Error('文件大小不能超过 2MB');
        }
      }

      let newAvatarUrl = avatarUrl;

      // Upload avatar if changed
      if (avatarFile) {
        const result = await storageOps.uploadAvatar(avatarFile);
        if (result) {
          newAvatarUrl = result.url;
        }
      }

      // Save profile
      await storageOps.saveUserProfile({
        username,
        avatar_url: newAvatarUrl,
      });

      // Refresh user state in online mode
      if (!isOfflineMode) {
        await refreshUser();
      }

      // Update local state
      setAvatarUrl(newAvatarUrl);
      setAvatarFile(null);
      setAvatarPreview(null);

      // Update store to notify other components
      setUserProfile({ username, avatarUrl: newAvatarUrl });

      toast({
        title: "账号已更新",
        description: isOfflineMode ? "您的个人资料已成功保存到本地" : "您的个人资料已成功更新",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "无法更新个人资料";
      toast({
        title: "更新失败",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getUserInitials = () => {
    if (isOfflineMode) return "离";
    if (!user) return "U";

    const email = user.email || "";
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }

    return "U";
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">账号设置</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="avatar" className="block mb-2">头像</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border">
                <AvatarImage
                  src={avatarPreview || avatarUrl}
                  alt="用户头像"
                />
                <AvatarFallback className="text-lg">{getUserInitials()}</AvatarFallback>
              </Avatar>
              <div>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="max-w-xs"
                />
                <p className="text-xs text-gray-500 mt-1">
                  推荐使用正方形图片，最大 2MB
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="username" className="block mb-2">用户名</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="max-w-md"
              placeholder="请输入用户名"
            />
          </div>

          {!isOfflineMode && (
            <div>
              <Label htmlFor="email" className="block mb-2">电子邮箱</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="max-w-md bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                邮箱地址无法直接修改
              </p>
            </div>
          )}

          {isOfflineMode && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm text-amber-700">
                离线模式下，您的个人资料将保存在本地设备上。
              </p>
            </div>
          )}
        </div>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            "保存更改"
          )}
        </Button>
      </form>
    </div>
  );
};

export default AccountSettings;
