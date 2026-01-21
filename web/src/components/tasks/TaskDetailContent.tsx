import React, { useRef, useState, useCallback } from "react";
import MilkdownEditor from "./MilkdownEditor";
import type { TaskAttachment } from "@/types/task";
import { useToast } from "@/hooks/use-toast";
import * as storageOps from "@/storage/operations";
import clsx from "clsx";

export type EditorBridge = {
  blocksToMarkdownLossy: () => Promise<string>;
  focus: () => void;
  insertImage: (url: string, alt: string) => void;
};

export interface TaskDetailContentProps {
  taskId: string;
  editorContent: string;
  isTaskInTrash: boolean;
  isEditorUpdating: boolean;
  onEditorChange: (content: string) => void;
  onEditorReady: (bridge: EditorBridge | null) => void;
  attachments: TaskAttachment[];
  onAttachmentsChange: (attachments: TaskAttachment[]) => void;
}

const TaskDetailContent: React.FC<TaskDetailContentProps> = ({
  taskId,
  editorContent,
  isTaskInTrash,
  isEditorUpdating,
  onEditorChange,
  onEditorReady,
  attachments,
  onAttachmentsChange,
}) => {
  const editorBridgeRef = useRef<EditorBridge | null>(null);
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const handleEditorReady = (bridge: EditorBridge | null) => {
    editorBridgeRef.current = bridge;
    onEditorReady(bridge);
  };

  const handleShellClick = () => {
    editorBridgeRef.current?.focus?.();
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);

      if (isTaskInTrash) return;

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const newAttachments: TaskAttachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;

        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "文件过大",
            description: `${file.name} 超过 10MB 限制`,
            variant: "destructive",
          });
          continue;
        }

        const isImage = file.type.startsWith("image/");

        try {
          toast({
            title: isImage ? "正在上传图片..." : "正在上传附件...",
            description: file.name,
          });

          const result = await storageOps.uploadAttachment(taskId || "temp", file);
          if (result) {
            newAttachments.push(result);

            if (isImage && editorBridgeRef.current) {
              editorBridgeRef.current.insertImage(result.url, file.name);
            }

            toast({
              title: isImage ? "图片上传成功" : "附件上传成功",
              description: file.name,
            });
          }
        } catch (error) {
          console.error("Upload failed:", error);
          toast({
            title: "上传失败",
            description: file.name,
            variant: "destructive",
          });
        }
      }

      if (newAttachments.length > 0) {
        const merged = [...attachments];
        newAttachments.forEach((attachment) => {
          if (!merged.find((item) => item.url === attachment.url)) {
            merged.push(attachment);
          }
        });
        onAttachmentsChange(merged);
      }
    },
    [taskId, attachments, onAttachmentsChange, onEditorChange, isTaskInTrash, toast]
  );

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer?.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  return (
    <div
      className={clsx(
        "task-editor-shell flex-1 flex flex-col",
        isDragging && "ring-2 ring-primary ring-offset-2 rounded-lg"
      )}
      onClick={handleShellClick}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none rounded-lg z-10">
          <div className="text-primary font-medium bg-background/80 px-4 py-2 rounded-md shadow">
            释放以上传文件
          </div>
        </div>
      )}
      <div className="w-full flex-1 overflow-visible">
        {!isEditorUpdating && (
          <MilkdownEditor
            taskId={taskId}
            content={editorContent}
            onChange={onEditorChange}
            readOnly={isTaskInTrash}
            onEditorReady={handleEditorReady}
            attachments={attachments}
            onAttachmentsChange={onAttachmentsChange}
          />
        )}
        {isTaskInTrash && (
          <div className="mt-4 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
            <p>此任务已在垃圾桶中，无法编辑。如需编辑，请先恢复任务。</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetailContent;
