import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { TaskAttachment } from '@/types/task';
import { Paperclip, Download, Trash2, FileText, Image, File, ChevronDown, ChevronUp } from 'lucide-react';
import * as storageOps from '@/storage/operations';

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
  const [collapsed, setCollapsed] = useState(true);
  const previousCountRef = useRef(attachments.length);

  useEffect(() => {
    if (attachments.length > previousCountRef.current) {
      setCollapsed(false);
    }
    previousCountRef.current = attachments.length;
  }, [attachments.length]);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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

  const downloadAttachment = (attachment: TaskAttachment) => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.original_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Paperclip className="h-4 w-4" />
          <span>附件 {attachments.length > 0 ? `(${attachments.length})` : ''}</span>
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>

        {!readOnly && (
          <div className="flex items-center gap-2">
            {uploading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
                上传中…
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleInputChange}
              className="hidden"
              accept="*/*"
            />
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-dashed"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              添加附件
            </Button>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="border-t">
          {attachments.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              暂无附件
            </div>
          ) : (
            <ul className="divide-y">
              {attachments.map((attachment) => {
                const IconComponent = getFileIcon(attachment.type);
                return (
                  <li key={attachment.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground" title={attachment.original_name}>
                          {attachment.original_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => downloadAttachment(attachment)}
                        title="下载附件"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeAttachment(attachment)}
                          title="删除附件"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskAttachments;