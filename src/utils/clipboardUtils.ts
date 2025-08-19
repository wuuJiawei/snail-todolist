import { supabase } from '@/integrations/supabase/client';
import { TaskAttachment } from '@/types/task';

export interface ClipboardImageDetectionOptions {
  userId: string;
  maxFileSize?: number; // in bytes, default 10MB
  onUploadStart?: () => void;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (attachment: TaskAttachment) => void;
  onUploadError?: (error: string) => void;
}

/**
 * 检测剪贴板中是否有图片文件
 * @param clipboardData ClipboardEvent的dataTransfer或clipboardData
 * @returns 图片文件数组
 */
export function detectClipboardImages(clipboardData: DataTransfer | null): File[] {
  if (!clipboardData) return [];

  const images: File[] = [];
  
  // 检查files中的图片
  if (clipboardData.files && clipboardData.files.length > 0) {
    for (let i = 0; i < clipboardData.files.length; i++) {
      const file = clipboardData.files[i];
      if (file.type.startsWith('image/')) {
        images.push(file);
      }
    }
  }

  // 检查items中的图片（适用于截图等场景）
  if (clipboardData.items && clipboardData.items.length > 0) {
    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file && !images.some(img => img.name === file.name && img.size === file.size)) {
          images.push(file);
        }
      }
    }
  }

  return images;
}

/**
 * 将图片文件上传到Supabase存储
 * @param file 图片文件
 * @param userId 用户ID
 * @returns TaskAttachment对象
 */
export async function uploadImageToStorage(file: File, userId: string): Promise<TaskAttachment> {
  // 生成唯一文件名
  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `paste_${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // 上传到Supabase Storage
  const { data, error } = await supabase.storage
    .from('task-attachments')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // 获取公共URL
  const { data: { publicUrl } } = supabase.storage
    .from('task-attachments')
    .getPublicUrl(filePath);

  return {
    id: data.path,
    filename: fileName,
    original_name: file.name || `pasted_image.${fileExt}`,
    url: publicUrl,
    size: file.size,
    type: file.type,
    uploaded_at: new Date().toISOString()
  };
}

/**
 * 处理剪贴板图片粘贴事件
 * @param event 粘贴事件
 * @param options 配置选项
 * @returns 是否检测到并处理了图片
 */
export async function handleClipboardImagePaste(
  event: ClipboardEvent,
  options: ClipboardImageDetectionOptions
): Promise<boolean> {
  const images = detectClipboardImages(event.clipboardData);
  
  if (images.length === 0) {
    return false;
  }

  // 阻止默认粘贴行为
  event.preventDefault();

  const { userId, maxFileSize = 10 * 1024 * 1024, onUploadStart, onUploadError, onUploadComplete } = options;

  try {
    onUploadStart?.();

    const uploadedAttachments: TaskAttachment[] = [];

    for (const image of images) {
      // 检查文件大小
      if (image.size > maxFileSize) {
        const errorMsg = `图片 ${image.name || '未命名'} 超过 ${Math.round(maxFileSize / 1024 / 1024)}MB 大小限制`;
        onUploadError?.(errorMsg);
        continue;
      }

      try {
        const attachment = await uploadImageToStorage(image, userId);
        uploadedAttachments.push(attachment);
        onUploadComplete?.(attachment);
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        const errorMsg = `上传图片失败: ${image.name || '未命名'}`;
        onUploadError?.(errorMsg);
      }
    }

    return uploadedAttachments.length > 0;
  } catch (error) {
    console.error('Clipboard image processing error:', error);
    onUploadError?.('处理剪贴板图片时出错');
    return false;
  }
}

/**
 * 为textarea添加剪贴板图片粘贴支持
 * @param textarea textarea元素引用
 * @param options 配置选项
 * @returns 清理函数
 */
export function addClipboardImageSupport(
  textarea: HTMLTextAreaElement | null,
  options: ClipboardImageDetectionOptions
): () => void {
  if (!textarea) {
    return () => {};
  }

  const handlePaste = (event: ClipboardEvent) => {
    handleClipboardImagePaste(event, options);
  };

  textarea.addEventListener('paste', handlePaste);

  return () => {
    textarea.removeEventListener('paste', handlePaste);
  };
}