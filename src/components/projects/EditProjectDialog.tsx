import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import EmojiPicker from "emoji-picker-react";
import { ChevronDown } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Project, ProjectFormValues } from "@/types/project";

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSave: ((id: string, data: Partial<Project>) => Promise<void>) | ((data: Partial<Project>) => Promise<void>);
}

const EditProjectDialog: React.FC<EditProjectDialogProps> = ({
  open,
  onOpenChange,
  project,
  onSave,
}) => {
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  // Initialize the form
  const form = useForm<ProjectFormValues>({
    defaultValues: {
      name: project?.name || "",
      icon: project?.icon || "📁", // 默认使用文件夹emoji
    },
  });

  // Reset form values when the dialog opens or the project changes
  useEffect(() => {
    if (open) {
      // Small delay to ensure dialog is fully rendered
      const timer = setTimeout(() => {
        form.reset({
          name: project?.name || "",
          icon: project?.icon || "📁", // 默认使用文件夹emoji
        });
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [form, project, open]);

  const onSubmit = async (data: ProjectFormValues) => {
    try {
      if (project) {
        // For editing existing projects
        await (onSave as (id: string, data: Partial<Project>) => Promise<void>)(project.id, data);
      } else {
        // For creating new projects
        await (onSave as (data: Partial<Project>) => Promise<void>)(data);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving project:", error);
    }
  };

  // 优化的关闭处理器
  const handleClose = useCallback((open: boolean) => {
    onOpenChange(open);
    if (!open) {
      // 重要：确保在关闭时重置表单状态
      setTimeout(() => {
        form.reset({
          name: project?.name || "",
          icon: project?.icon || "📁", // 默认使用文件夹emoji
        });
        // 只重置可能影响交互的样式
        document.body.style.pointerEvents = '';
        setEmojiPickerOpen(false);
      }, 50);
    }
  }, [form, project, onOpenChange]);

  // 处理取消按钮的点击
  const handleCancel = useCallback(() => {
    form.reset({
      name: project?.name || "",
      icon: project?.icon || "📁", // 默认使用文件夹emoji
    });
    onOpenChange(false);
  }, [form, project, onOpenChange]);

  const handleEmojiClick = (emojiData: { emoji: string }) => {
    form.setValue("icon", emojiData.emoji, { shouldDirty: true });
    setEmojiPickerOpen(false);
  };

  const dialogTitle = project ? "修改清单" : "新建清单";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!form.formState.isSubmitting) handleClose(nextOpen);
    }}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto p-0 sm:max-w-[440px]">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="text-base">{dialogTitle}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <fieldset disabled={form.formState.isSubmitting}>
              <div className="space-y-5 px-6 py-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>名称</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-11" placeholder="清单名称" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>图标</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 w-full justify-between px-3 font-normal"
                        aria-expanded={emojiPickerOpen}
                        onClick={() => setEmojiPickerOpen((current) => !current)}
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xl">
                            {field.value}
                          </span>
                          <span className="font-medium">选择图标</span>
                        </span>
                        <ChevronDown className={`text-muted-foreground transition-transform ${emojiPickerOpen ? "rotate-180" : ""}`} />
                      </Button>

                      {emojiPickerOpen && (
                        <div className="overflow-hidden rounded-md border">
                          <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            width="100%"
                            height={260}
                            previewConfig={{ showPreview: false }}
                            searchPlaceholder="搜索表情"
                            searchClearButtonLabel="清除搜索"
                            autoFocusSearch={false}
                            lazyLoadEmojis
                          />
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="border-t bg-muted/20 px-6 py-4 sm:space-x-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  取消
                </Button>
                <Button type="submit" loading={form.formState.isSubmitting}>保存</Button>
              </DialogFooter>
            </fieldset>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProjectDialog;
