import React, { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectContext } from "@/contexts/ProjectContext";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { WifiOff } from "lucide-react";
import { isOfflineMode } from "@/storage";
import { apiClient } from "@/lib/apiClient";

interface JoinSharedProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  shareCode: z.string().min(1, "分享码不能为空").max(10)
});

type FormValues = z.infer<typeof formSchema>;

const JoinSharedProjectDialog: React.FC<JoinSharedProjectDialogProps> = ({
  open,
  onOpenChange,
}) => {
  if (isOfflineMode) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>加入共享清单</DialogTitle>
            <DialogDescription>离线模式下无法使用此功能</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 gap-4 text-muted-foreground">
            <WifiOff className="h-12 w-12" />
            <p className="text-sm text-center">加入共享清单需要网络连接，请在在线模式下使用</p>
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

  const [loading, setLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { refreshProjects } = useProjectContext();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shareCode: ""
    }
  });

  React.useEffect(() => {
    if (open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = async (data: FormValues) => {
    if (!user) {
      toast({
        title: "加入失败",
        description: "您需要登录才能加入共享清单",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/share/join', {
        share_code: data.shareCode.toUpperCase()
      });

      await refreshProjects();

      toast({
        title: "加入成功",
        description: "您已成功加入共享清单，现在可以查看和编辑清单中的任务",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error joining shared project:', error);
      const message = error instanceof Error ? error.message : "无法加入共享清单，请稍后再试";
      toast({
        title: "加入失败",
        description: message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>加入共享清单</DialogTitle>
          <DialogDescription>
            输入分享码加入其他用户共享的清单
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="shareCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>分享码</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="输入分享码"
                      disabled={loading}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                取消
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "加入中..." : "加入"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default JoinSharedProjectDialog;
