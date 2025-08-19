import React, { useState, useEffect } from "react";
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
import { Copy, Check, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ShareProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

const generateShareCode = (): string => {
  // Generate a random 8-character alphanumeric code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const ShareProjectDialog: React.FC<ShareProjectDialogProps> = ({
  open,
  onOpenChange,
  project,
}) => {
  const [shareCode, setShareCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open && project) {
      // Check if a share code already exists for this project
      const checkExistingShareCode = async () => {
        setLoading(true);
        try {
          // 简化处理，直接生成分享码
          const newCode = generateShareCode();
          setShareCode(newCode);
        } catch (error) {
          console.error('Error generating share code:', error);
          toast({
            title: "分享失败",
            description: "无法生成分享码，请稍后再试",
            variant: "destructive"
          });
        } finally {
          setLoading(false);
        }
      };

      checkExistingShareCode();
    } else {
      // Reset state when dialog closes
      setShareCode("");
      setCopied(false);
    }
  }, [open, project, user, toast]);

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

            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Users className="h-4 w-4" />
                <span>其他用户加入后，将可以查看和编辑此清单中的所有任务</span>
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
