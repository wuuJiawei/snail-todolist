import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TaskAttachment } from '@/types/task';
import { Upload, X, Eye, Download, FileText, Image, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import AttachmentPreviewModal from '@/components/attachments/AttachmentPreviewModal';

interface TaskAttachmentsProps {
  attachments: TaskAttachment[];
  onAttachmentsChange: (attachments: TaskAttachment[]) => void;
  readOnly?: boolean;
}

const TaskAttachments: React.FC<TaskAttachmentsProps> = ({
  attachments = [],
  onAttachmentsChange,
  readOnly = false
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<TaskAttachment | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // File type detection
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) return FileText;
    return File;
  };

  const isImageFile = (type: string) => type.startsWith('image/');

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Upload file to Supabase
  const uploadFile = async (file: File): Promise<TaskAttachment> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(filePath);

    return {
      id: data.path,
      filename: fileName,
      original_name: file.name,
      url: publicUrl,
      size: file.size,
      type: file.type,
      uploaded_at: new Date().toISOString()
    };
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!files.length || readOnly) return;

    setUploading(true);
    const newAttachments: TaskAttachment[] = [];

    try {
      // Upload all files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check file size (limit to 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "文件过大",
            description: `${file.name} 超过 10MB 限制`,
            variant: "destructive",
          });
          continue;
        }

        try {
          const attachment = await uploadFile(file);
          newAttachments.push(attachment);
        } catch (error) {
          console.error('Error uploading file:', error);
          toast({
            title: "上传失败",
            description: `无法上传 ${file.name}`,
            variant: "destructive",
          });
        }
      }

      if (newAttachments.length > 0) {
        const updatedAttachments = [...attachments, ...newAttachments];
        onAttachmentsChange(updatedAttachments);
        toast({
          title: "上传成功",
          description: `已上传 ${newAttachments.length} 个文件`,
        });
      }
    } finally {
      setUploading(false);
    }
  }, [attachments, onAttachmentsChange, readOnly, toast, user]);

  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files);
    }
  };

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  // Remove attachment
  const removeAttachment = async (attachment: TaskAttachment) => {
    if (readOnly) return;

    try {
      // Delete from Supabase Storage
      const { error } = await supabase.storage
        .from('task-attachments')
        .remove([attachment.id]);

      if (error) throw error;

      // Update attachments list
      const updatedAttachments = attachments.filter(a => a.id !== attachment.id);
      onAttachmentsChange(updatedAttachments);
      
      toast({
        title: "删除成功",
        description: "附件已删除",
      });
    } catch (error) {
      console.error('Error removing attachment:', error);
      toast({
        title: "删除失败",
        description: "无法删除附件",
        variant: "destructive",
      });
    }
  };

  // Preview attachment
  const handlePreviewAttachment = (attachment: TaskAttachment) => {
    setPreviewAttachment(attachment);
    setPreviewModalOpen(true);
  };

  // Close preview modal
  const closePreviewModal = () => {
    setPreviewModalOpen(false);
    setPreviewAttachment(null);
  };

  // Download attachment
  const downloadAttachment = (attachment: TaskAttachment) => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.original_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      {!readOnly && (
        <div
          className={cn(
            "border-2 border-dashed border-gray-300 rounded-lg text-center transition-colors",
            dragOver && "border-blue-500 bg-blue-50",
            "hover:border-gray-400",
            "p-4"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleInputChange}
            className="hidden"
            accept="*/*"
          />
          
          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          
          <p className="text-sm text-gray-600 mb-2">
            拖放文件到此处或 
            <Button
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              点击选择文件
            </Button>
          </p>
          
          <p className="text-xs text-gray-500">
            支持多文件上传，单个文件最大 10MB
          </p>
          
          {uploading && (
            <div className="flex items-center justify-center mt-2">
              <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">上传中...</span>
            </div>
          )}
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            附件 ({attachments.length})
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {attachments.map((attachment) => {
              const IconComponent = getFileIcon(attachment.type);
              const isImage = isImageFile(attachment.type);
              return (
                <div
                  key={attachment.id}
                  className="relative group bg-gray-50 rounded-lg border p-2 hover:bg-gray-100 transition-colors"
                >
                  {/* File Preview/Icon */}
                  <div 
                    className="aspect-square bg-white rounded border mb-2 flex items-center justify-center overflow-hidden cursor-pointer"
                    onClick={() => handlePreviewAttachment(attachment)}
                  >
                    {isImage ? (
                      <img
                        src={attachment.url}
                        alt={attachment.original_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <IconComponent className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  
                  {/* File Info */}
                  <div 
                    className="space-y-1 cursor-pointer"
                    onClick={() => handlePreviewAttachment(attachment)}
                  >
                    <p className="text-xs font-medium text-gray-900 truncate" title={attachment.original_name}>
                      {attachment.original_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(attachment.size)}
                    </p>
                  </div>
                  
                  {/* Action Buttons - Show on hover */}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col space-y-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewAttachment(attachment);
                      }}
                      className="h-6 w-6 p-0 bg-white shadow-sm"
                      title="预览"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadAttachment(attachment);
                      }}
                      className="h-6 w-6 p-0 bg-white shadow-sm"
                      title="下载"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    
                    {!readOnly && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAttachment(attachment);
                        }}
                        className="h-6 w-6 p-0 bg-white shadow-sm text-red-500 hover:text-red-700"
                        title="删除"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      <AttachmentPreviewModal
        attachment={previewAttachment}
        isOpen={previewModalOpen}
        onClose={closePreviewModal}
      />
    </div>
  );
};

export default TaskAttachments;