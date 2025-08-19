import React, { useState } from 'react';
import { TaskAttachment } from '@/types/task';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText, Image, File, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttachmentPreviewModalProps {
  attachment: TaskAttachment | null;
  isOpen: boolean;
  onClose: () => void;
}

const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({
  attachment,
  isOpen,
  onClose,
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // File type detection - safe with null attachment
  const isImage = attachment?.type.startsWith('image/') ?? false;
  const isPDF = attachment?.type.includes('pdf') ?? false;
  const isText = attachment ? (
    attachment.type.includes('text') || 
    attachment.type.includes('json') ||
    attachment.type.includes('xml') ||
    attachment.type.includes('javascript') ||
    attachment.type.includes('typescript') ||
    attachment.original_name.match(/\.(txt|md|json|xml|js|ts|jsx|tsx|css|scss|less|html|htm|csv)$/i)
  ) : false;
  
  const isVideo = attachment?.type.startsWith('video/') ?? false;
  const isAudio = attachment?.type.startsWith('audio/') ?? false;

  // Determine if file can be previewed
  const canPreview = isImage || isPDF || isText || isVideo || isAudio;
  
  // File size threshold for text files (1MB)
  const isTextFileTooBig = isText && attachment && attachment.size > 1024 * 1024;

  // Get appropriate icon
  const getFileIcon = () => {
    if (isImage) return Image;
    if (isPDF || isText) return FileText;
    return File;
  };

  const IconComponent = getFileIcon();

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Download handler
  const handleDownload = () => {
    if (!attachment) return;
    
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.original_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle image load events
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  // Reset states when modal opens
  React.useEffect(() => {
    if (isOpen && attachment) {
      setImageLoading(true);
      setImageError(false);
    }
  }, [isOpen, attachment]);

  // Handle keyboard events
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'd':
        case 'D':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleDownload();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-4xl max-h-[90vh] overflow-hidden",
        canPreview ? "w-[90vw]" : "max-w-md"
      )}>
        {attachment ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <IconComponent className="h-4 w-4" />
                <span className="truncate" title={attachment.original_name}>
                  {attachment.original_name}
                </span>
              </DialogTitle>
              <div className="text-sm text-muted-foreground">
                {formatFileSize(attachment.size)} • {attachment.type}
              </div>
            </DialogHeader>

        <div className="flex-1 overflow-auto">
          {canPreview ? (
            <div className="space-y-4">
              {/* Image Preview */}
              {isImage && (
                <div className="relative bg-gray-50 rounded-lg overflow-hidden min-h-[200px] flex items-center justify-center">
                  {imageLoading && !imageError && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
                    </div>
                  )}
                  {imageError ? (
                    <div className="flex flex-col items-center justify-center text-muted-foreground p-8">
                      <AlertCircle className="h-8 w-8 mb-2" />
                      <p className="text-sm">图片加载失败</p>
                      <p className="text-xs mt-1">请尝试下载查看</p>
                    </div>
                  ) : (
                    <img
                      src={attachment.url}
                      alt={attachment.original_name}
                      className={cn(
                        "max-w-full max-h-[60vh] object-contain transition-opacity",
                        imageLoading ? "opacity-0" : "opacity-100"
                      )}
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                    />
                  )}
                </div>
              )}

              {/* PDF Preview */}
              {isPDF && (
                <div className="bg-gray-50 rounded-lg p-4 min-h-[300px]">
                  <iframe
                    src={`${attachment.url}#toolbar=0`}
                    className="w-full h-[60vh] border-0 rounded"
                    title={attachment.original_name}
                  />
                </div>
              )}

              {/* Text File Preview */}
              {isText && !isTextFileTooBig && (
                <div className="bg-gray-50 rounded-lg p-4 min-h-[200px]">
                  <iframe
                    src={attachment.url}
                    className="w-full h-[40vh] border-0 rounded bg-white"
                    title={attachment.original_name}
                  />
                </div>
              )}

              {/* Text File Too Large */}
              {isText && isTextFileTooBig && (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-lg">
                  <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium mb-2">文件过大</h3>
                  <p className="text-sm text-muted-foreground">
                    该文本文件超过 1MB，请下载后查看。
                  </p>
                </div>
              )}

              {/* Video Preview */}
              {isVideo && (
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <video
                    src={attachment.url}
                    controls
                    className="w-full max-h-[60vh]"
                    preload="metadata"
                  >
                    您的浏览器不支持视频播放
                  </video>
                </div>
              )}

              {/* Audio Preview */}
              {isAudio && (
                <div className="bg-gray-50 rounded-lg p-8 flex flex-col items-center">
                  <div className="mb-4 p-4 bg-white rounded-full">
                    <File className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <audio
                    src={attachment.url}
                    controls
                    className="w-full max-w-md"
                    preload="metadata"
                  >
                    您的浏览器不支持音频播放
                  </audio>
                </div>
              )}
            </div>
          ) : (
            // Unsupported file type
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 p-4 bg-muted rounded-full">
                <IconComponent className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">无法预览此文件</h3>
              <p className="text-sm text-muted-foreground mb-4">
                此文件类型暂不支持在线预览，您可以下载后使用相应的软件打开。
              </p>
              <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded">
                {attachment.type}
              </div>
            </div>
          )}
        </div>

            <DialogFooter className="gap-2">
              <div className="text-xs text-muted-foreground mr-auto hidden sm:block">
                按 Esc 关闭 • Ctrl+D 下载
              </div>
              <Button variant="outline" onClick={onClose}>
                关闭
              </Button>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                下载文件
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            没有选择附件
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AttachmentPreviewModal;