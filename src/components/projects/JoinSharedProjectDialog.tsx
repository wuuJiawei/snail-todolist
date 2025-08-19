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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectContext } from "@/contexts/ProjectContext";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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

  // Reset form when dialog opens/closes
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
      // Find the project share by code
      const { data: shareData, error: shareError } = await supabase
        .from('project_shares')
        .select('project_id, created_by')
        .eq('share_code', data.shareCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (shareError) {
        throw shareError;
      }

      if (!shareData) {
        toast({
          title: "加入失败",
          description: "无效的分享码或分享已过期",
          variant: "destructive"
        });
        return;
      }

      // Check if the user is trying to join their own project
      if (shareData.created_by === user.id) {
        toast({
          title: "加入失败",
          description: "您不能加入自己创建的清单",
          variant: "destructive"
        });
        return;
      }

      // Check if the user is already a member of this project
      const { data: existingMembership, error: membershipError } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', shareData.project_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (membershipError) {
        throw membershipError;
      }

      if (existingMembership) {
        toast({
          title: "已存在",
          description: "您已经是此清单的成员",
          variant: "destructive"
        });
        return;
      }

      // Use the database function to join the shared project
      const { data: joinResult, error: joinError } = await supabase
        .rpc('join_shared_project', {
          input_share_code: data.shareCode.toUpperCase(),
          joining_user_id: user.id
        });

      if (joinError) {
        throw joinError;
      }

      if (!joinResult) {
        toast({
          title: "加入失败",
          description: "无法加入清单，请稍后再试",
          variant: "destructive"
        });
        return;
      }

      console.log("Successfully joined project with ID:", joinResult);

      // Debug: Check if the user was actually added to project_members
      const { data: membershipCheck, error: membershipCheckError } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', joinResult)
        .eq('user_id', user.id);

      console.log("Membership check:", {
        membershipCheck,
        membershipCheckError,
        userId: user.id,
        projectId: joinResult
      });

      // Refresh projects to include the newly joined project
      await refreshProjects();

      toast({
        title: "加入成功",
        description: "您已成功加入共享清单，现在可以查看和编辑清单中的任务",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error joining shared project:', error);
      toast({
        title: "加入失败",
        description: "无法加入共享清单，请稍后再试",
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
