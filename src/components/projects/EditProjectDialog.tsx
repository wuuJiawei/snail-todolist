import React, { useCallback, useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import EmojiPicker from 'emoji-picker-react';

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Initialize the form
  const form = useForm<ProjectFormValues>({
    defaultValues: {
      name: project?.name || "",
      icon: project?.icon || "📁", // 默认使用文件夹emoji
    },
  });

  // 修复emoji选择器的滚轮事件
  useEffect(() => {
    if (emojiPickerOpen && emojiPickerRef.current) {
      const container = emojiPickerRef.current;
      
      const handleWheel = (e: WheelEvent) => {
        // 查找实际的滚动容器
        const scrollContainer = container.querySelector('.epr-body') as HTMLElement;
        if (scrollContainer) {
          // 阻止默认行为和冒泡
          e.preventDefault();
          e.stopPropagation();
          
          // 计算新的滚动位置
          const deltaY = e.deltaY;
          const currentScrollTop = scrollContainer.scrollTop;
          const maxScrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight;
          
          // 设置新的滚动位置
          const newScrollTop = Math.max(0, Math.min(maxScrollTop, currentScrollTop + deltaY));
          scrollContainer.scrollTop = newScrollTop;
        }
      };

      // 添加wheel事件监听器，使用capture模式确保优先处理
      container.addEventListener('wheel', handleWheel, { passive: false, capture: true });

      // 也为emoji picker内部的所有元素添加事件监听
      const addWheelToChildren = () => {
        const emojiPicker = container.querySelector('.EmojiPickerReact');
        if (emojiPicker) {
          emojiPicker.addEventListener('wheel', handleWheel, { passive: false, capture: true });
        }
      };

      // 延迟添加，确保emoji picker已经渲染
      const timer = setTimeout(addWheelToChildren, 100);

      return () => {
        clearTimeout(timer);
        container.removeEventListener('wheel', handleWheel, { capture: true });
        const emojiPicker = container.querySelector('.EmojiPickerReact');
        if (emojiPicker) {
          emojiPicker.removeEventListener('wheel', handleWheel, { capture: true });
        }
      };
    }
  }, [emojiPickerOpen]);

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
    form.setValue("icon", emojiData.emoji);
    setEmojiPickerOpen(false);
  };

  const dialogTitle = project ? "修改清单" : "新建清单";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!form.formState.isSubmitting) handleClose(nextOpen);
    }}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <fieldset disabled={form.formState.isSubmitting} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名称</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="清单名称" />
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
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                        <span className="text-2xl">{field.value}</span>
                      </div>
                      <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" type="button">
                            选择表情
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0"
                          side="right"
                          onWheel={(e) => {
                            // 让滚轮事件传递到内部的emoji picker
                            e.stopPropagation();
                          }}
                        >
                          <div ref={emojiPickerRef} className="emoji-picker-container">
                            <EmojiPicker
                              onEmojiClick={handleEmojiClick}
                              width={350}
                              height={400}
                              previewConfig={{
                                defaultEmoji: "1f4c1",
                                defaultCaption: "选择一个表情作为清单图标"
                              }}
                              searchDisabled={false}
                              skinTonesDisabled={false}
                              lazyLoadEmojis={true}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
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
