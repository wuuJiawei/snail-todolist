import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { TaskAttachment } from '@/types/task';
import { Paperclip, Download, Trash2, FileText, Image, File, Plus } from 'lucide-react';
import * as storageOps from '@/storage/operations';
import clsx from 'clsx';

interface TaskAttachmentsProps {
  attachments: TaskAttachment[];
  onAttachmentsChange: (attachments: TaskAttachment[]) => void;
  readOnly?: boolean;
}

const TaskAttachments: React.FC<TaskAttachmentsProps> = ({
  attachments = [],
  onAttachmentsChange,
  readOnly = false,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleFileUpload = useCallback(async (files: FileList, taskId?: string) => {
    if (!files.length || readOnly) return;

    setUploading(true);
    const newAttachments: TaskAttachment[] = [];

    try {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: '文件过大',
            description: `${file.name} 超过 10MB 限制`,
            variant: 'destructive',
          });
          continue;
        }

        try {
          const result = await storageOps.uploadAttachment(taskId || 'temp', file);
          if (result) {
            newAttachments.push(result);
          }
        } catch (error) {
          console.error('Error uploading file:', error);
          toast({
            title: '上传失败',
            description: `无法上传 ${file.name}`,
            variant: 'destructive',
          });
        }
      }

      if (newAttachments.length > 0) {
        const updatedAttachments = [...attachments, ...newAttachments];
        onAttachmentsChange(updatedAttachments);
        toast({
          title: '上传成功',
          description: `已上传 ${newAttachments.length} 个文件`,
        });
      }
    } finally {
      setUploading(false);
    }
  }, [attachments, onAttachmentsChange, readOnly, toast]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFileUpload(event.target.files);
      event.target.value = '';
    }
  };

  const removeAttachment = async (attachment: TaskAttachment) => {
    if (readOnly) return;

    try {
      await storageOps.deleteAttachment(attachment.id);
      const updatedAttachments = attachments.filter((item) => item.id !== attachment.id);
      onAttachmentsChange(updatedAttachments);
      toast({
        title: '删除成功',
        description: '附件已删除',
      });
    } catch (error) {
      console.error('Error removing attachment:', error);
      toast({
        title: '删除失败',
        description: '无法删除附件',
        variant: 'destructive',
      });
    }
  };

  const downloadAttachment = async (attachment: TaskAttachment) => {
    try {
      const response = await fetch(attachment.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = attachment.original_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(attachment.url, '_blank');
    }
  };

  const hasAttachments = attachments.length > 0;

  return (
    <div className="absolute bottom-6 right-6 z-20">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={clsx(
              "relative flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all duration-200",
              "hover:scale-105 hover:shadow-xl active:scale-95",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              hasAttachments
                ? "bg-primary text-primary-foreground"
                : "bg-muted/80 text-muted-foreground hover:bg-muted"
            )}
            aria-label={`附件${hasAttachments ? ` (${attachments.length})` : ''}`}
          >
            <Paperclip className="h-5 w-5" />
            {hasAttachments && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold bg-destructive text-destructive-foreground rounded-full">
                {attachments.length}
              </span>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="end"
          sideOffset={8}
          className="w-72 p-0 overflow-hidden"
        >
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                附件 {hasAttachments && <span className="text-muted-foreground">({attachments.length})</span>}
              </h4>
              {uploading && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {!hasAttachments ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                暂无附件
              </div>
            ) : (
              <ul className="divide-y">
                {attachments.map((attachment) => {
                  const IconComponent = getFileIcon(attachment.type);
                  return (
                    <li
                      key={attachment.id}
                      className="group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-muted">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          title={attachment.original_name}
                        >
                          {attachment.original_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.size)}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => downloadAttachment(attachment)}
                          title="下载"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeAttachment(attachment)}
                            title="删除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {!readOnly && (
            <div className="px-3 py-2.5 border-t bg-muted/20">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleInputChange}
                className="hidden"
                accept="*/*"
              />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Plus className="h-4 w-4" />
                添加附件
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TaskAttachments;
