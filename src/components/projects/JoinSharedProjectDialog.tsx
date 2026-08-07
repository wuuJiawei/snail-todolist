import React from "react";
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
import { joinSharedProject } from "@/data/operations";
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

    try {
      await joinSharedProject(data.shareCode, user.id);

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
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!form.formState.isSubmitting) onOpenChange(nextOpen);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>加入共享清单</DialogTitle>
          <DialogDescription>
            输入分享码加入其他用户共享的清单
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <fieldset disabled={form.formState.isSubmitting} className="space-y-4 py-4">
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
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button type="submit" loading={form.formState.isSubmitting}>加入</Button>
              </DialogFooter>
            </fieldset>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default JoinSharedProjectDialog;
