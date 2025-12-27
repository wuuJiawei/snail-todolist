import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Project } from "@/types/project";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Copy, Check, Users, Link2, X, WifiOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateActiveShare } from "@/services/projectShareService";
import { listMembers, removeMember, getProfileById, type ProjectMemberRow, type Profile } from "@/services/projectMemberService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { isOfflineMode } from "@/storage";

interface ShareProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

// 分享链接前缀
const shareLinkFor = (code: string) => `${window.location.origin}/join/${code}`;

const ShareProjectDialog: React.FC<ShareProjectDialogProps> = ({
  open,
  onOpenChange,
  project,
}) => {
  // Show offline message if in offline mode
  if (isOfflineMode) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>分享清单</DialogTitle>
            <DialogDescription>离线模式下无法使用分享功能</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 gap-4 text-muted-foreground">
            <WifiOff className="h-12 w-12" />
            <p className="text-sm text-center">分享功能需要网络连接，请在在线模式下使用</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const [shareCode, setShareCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [shareLink, setShareLink] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [members, setMembers] = useState<ProjectMemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState<boolean>(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
  const lastLoadedProjectRef = useRef<string | null>(null);
  const membersCacheRef = useRef<Record<string, ProjectMemberRow[]>>({});

  useEffect(() => {
    if (open && project) {
      const ensureShare = async () => {
        setLoading(true);
        try {
          if (!user) {
            toast({
              title: "需要登录",
              description: "请登录后再生成分享码",
              variant: "destructive",
            });
            return;
          }
          const active = await getOrCreateActiveShare(project.id, user.id);
          const code = active?.share_code || "";
          setShareCode(code);
          setShareLink(code ? shareLinkFor(code) : "");
        } catch (error) {
          console.error('Error generating/fetching share code:', error);
          toast({
            title: "分享失败",
            description: "无法生成分享码，请稍后再试",
            variant: "destructive"
          });
        } finally {
          setLoading(false);
        }
      };

      ensureShare();

      const pid = project.id;
      const last = lastLoadedProjectRef.current;
      if (last !== pid) {
        lastLoadedProjectRef.current = pid;
        const cached = membersCacheRef.current[pid];
        if (cached && cached.length >= 0) {
          setMembers(cached);
          setMembersLoading(false);
        } else {
          setMembersLoading(true);
          listMembers(pid)
            .then((list) => {
              setMembers(list);
              membersCacheRef.current[pid] = list;
            })
            .catch((e) => {
              console.error('load members error', e);
            })
            .finally(() => setMembersLoading(false));
        }
        if (project.user_id) {
          getProfileById(project.user_id)
            .then((p) => setOwnerProfile(p))
            .catch((e) => console.error('load owner profile error', e));
        }
      } else {
        const cached = membersCacheRef.current[pid];
        if (cached && cached.length >= 0) {
          setMembers(cached);
          setMembersLoading(false);
        }
      }
    } else {
      setShareCode("");
      setShareLink("");
      setCopied(false);
      setCopiedLink(false);
      setMembers([]);
      setMembersLoading(false);
      setRemoving(null);
      setOwnerProfile(null);
    }
  }, [open, project?.id, user?.id]);

  useEffect(() => {
    if (!open || !project) return;
    const pid = project.id;
    const channel = supabase.channel(`share:members:${pid}`);
    const onChange = async () => {
      delete membersCacheRef.current[pid];
      setMembersLoading(true);
      try {
        const list = await listMembers(pid);
        setMembers(list);
        membersCacheRef.current[pid] = list;
      } finally {
        setMembersLoading(false);
      }
    };
    channel.on("postgres_changes", { event: "*", schema: "public", table: "project_members", filter: `project_id=eq.${pid}` }, onChange).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, project?.id]);

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(shareCode).then(() => {
      setCopied(true);
      toast({
        title: "已复制",
        description: "分享码已复制到剪贴板",
      });

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };

  const handleCopyLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopiedLink(true);
      toast({
        title: "已复制",
        description: "分享链接已复制到剪贴板",
      });
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const refreshMembers = async () => {
    if (!project) return;
    setMembersLoading(true);
    try {
      const list = await listMembers(project.id);
      setMembers(list);
      membersCacheRef.current[project.id] = list;
    } catch (e) {
      console.error('refresh members error', e);
    } finally {
      setMembersLoading(false);
    }
  };

  const isOwner = !!(project && user && project.user_id === user.id);
  const handleRemove = async (targetUserId: string, role?: string) => {
    if (!project) return;
    if (!user) return;
    const isSelf = targetUserId === user.id;
    if (!isOwner && !isSelf) return;
    const ok = window.confirm(isSelf ? "确定要退出该共享清单吗？" : `确定要移除此成员${role ? `（${role}）` : ''}吗？`);
    if (!ok) return;
    try {
      setRemoving(targetUserId);
      await removeMember(project.id, targetUserId);
      const list = await listMembers(project.id);
      setMembers(list);
      membersCacheRef.current[project.id] = list;
      toast({ title: isSelf ? "已退出共享" : "已移除成员" });
    } catch (e) {
      console.error('remove member error', e);
      toast({ title: "操作失败", description: "请稍后再试", variant: "destructive" });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>分享清单</DialogTitle>
          <DialogDescription>
            生成一个分享码，其他用户可以使用此码加入您的清单。
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">清单名称</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">{project?.name}</p>
            </div>

            <div>
              <label htmlFor="share-code" className="text-sm font-medium">分享码</label>
              <div className="flex mt-1">
                <Input
                  id="share-code"
                  value={shareCode}
                  readOnly
                  className="flex-1"
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="ml-2"
                  onClick={handleCopyToClipboard}
                  disabled={loading || !shareCode}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                分享码有效期为30天
              </p>
            </div>

            <div>
              <label htmlFor="share-link" className="text-sm font-medium">分享链接</label>
              <div className="flex mt-1">
                <Input
                  id="share-link"
                  value={shareLink}
                  readOnly
                  className="flex-1"
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="ml-2"
                  onClick={handleCopyLink}
                  disabled={loading || !shareLink}
                >
                  {copiedLink ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                发送链接给对方，点击即可加入；或手动输入分享码
              </p>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Users className="h-4 w-4" />
                <span>其他用户加入后，将可以查看和编辑此清单中的所有任务</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">成员管理</div>
                <Button type="button" variant="outline" size="sm" onClick={refreshMembers} disabled={membersLoading || !project}>刷新</Button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={ownerProfile?.avatar_url || ''} />
                      <AvatarFallback>{(ownerProfile?.display_name || ownerProfile?.email || project?.user_id || '?').slice(0,1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{ownerProfile?.display_name || ownerProfile?.email || project?.user_id || '-'}</div>
                      <div className="text-xs text-gray-500">拥有者</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 shrink-0">不可移除</div>
                </div>

                {membersLoading ? (
                  <div className="text-xs text-gray-500">成员加载中...</div>
                ) : members.length === 0 ? (
                  <div className="text-xs text-gray-500">暂无其他成员</div>
                ) : (
                  members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={m.profile?.avatar_url || ''} />
                          <AvatarFallback>{(m.profile?.display_name || m.profile?.email || m.user_id || '?').slice(0,1)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{m.profile?.display_name || m.profile?.email || m.user_id || '-'}</div>
                          <div className="text-xs text-gray-500 truncate">{m.role ? `成员（${m.role}）` : '成员'}</div>
                        </div>
                      </div>
                      {(isOwner || (user && user.id === m.user_id)) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRemove(m.user_id || '', m.role)}
                          disabled={removing === (m.user_id || '')}
                          title={user && user.id === m.user_id ? '退出共享' : '移除成员'}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareProjectDialog;
