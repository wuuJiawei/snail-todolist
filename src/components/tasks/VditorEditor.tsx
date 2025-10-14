import React, { useEffect, useRef, useState } from 'react';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { TaskAttachment } from '@/types/task';
import { supabase } from '@/integrations/supabase/client';

interface VditorEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
  taskId?: string;
  onEditorReady?: (editor: { blocksToMarkdownLossy: () => Promise<string> }) => void;
  attachments?: TaskAttachment[];
  onAttachmentsChange?: (attachments: TaskAttachment[]) => void;
}

const VditorEditor: React.FC<VditorEditorProps> = ({
  content,
  onChange,
  readOnly = false,
  taskId,
  onEditorReady,
  attachments = [],
  onAttachmentsChange
}) => {
  const vditorRef = useRef<Vditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const lastTaskIdRef = useRef<string | undefined>(undefined);
  const isInitializedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // Handle file upload
  const uploadFile = async (file: File): Promise<string> => {
    if (!user) throw new Error('用户未登录');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('task-attachments')
      .upload(fileName, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  // Initialize Vditor
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return;

    const vditor = new Vditor(containerRef.current, {
      height: '100%',
      width: '100%',
      mode: 'ir', // 即时渲染模式，类似 Typora
      placeholder: '输入任务内容... 📋✨\n\n支持 Markdown 格式\n直接粘贴图片自动上传\n\n💡 快捷键：\n- Ctrl/Cmd + B: 粗体\n- Ctrl/Cmd + I: 斜体\n- Ctrl/Cmd + K: 插入链接',
      theme: 'classic',
      icon: 'material',
      toolbarConfig: {
        pin: true,
        hide: false,
      },
      toolbar: [
        'emoji',
        'headings',
        'bold',
        'italic',
        'strike',
        '|',
        'line',
        'quote',
        'list',
        'ordered-list',
        'check',
        '|',
        'code',
        'inline-code',
        'link',
        'table',
        '|',
        'undo',
        'redo',
        '|',
        'upload',
        'edit-mode',
        'fullscreen',
      ],
      cache: {
        enable: false, // 禁用缓存，避免与任务切换冲突
      },
      counter: {
        enable: true,
        type: 'text',
      },
      preview: {
        markdown: {
          toc: true,
          mark: true,
          footnotes: true,
          autoSpace: true,
        },
        hljs: {
          style: 'github',
          lineNumber: true,
        },
      },
      upload: {
        accept: 'image/*',
        handler: async (files: File[]) => {
          const uploadPromises = files.map(async (file) => {
            try {
              toast({
                title: "正在上传图片...",
                description: file.name,
              });

              const url = await uploadFile(file);

              // Create attachment record
              const attachment: TaskAttachment = {
                id: crypto.randomUUID(),
                url: url,
                file_name: file.name,
                original_name: file.name,
                file_type: file.type,
                file_size: file.size,
                uploaded_at: new Date().toISOString(),
              };

              // Add to attachments list
              if (onAttachmentsChange) {
                const newAttachments = [...attachments, attachment];
                onAttachmentsChange(newAttachments);
              }

              toast({
                title: "图片上传成功",
                description: file.name,
              });

              return url;
            } catch (error) {
              console.error('Upload failed:', error);
              toast({
                title: "图片上传失败",
                description: file.name,
                variant: "destructive",
              });
              return null;
            }
          });

          const urls = await Promise.all(uploadPromises);
          const successUrls = urls.filter((url): url is string => url !== null);

          // Return success JSON for Vditor
          return JSON.stringify({
            msg: '',
            code: 0,
            data: {
              errFiles: [],
              succMap: Object.fromEntries(
                successUrls.map((url, i) => [files[i].name, url])
              ),
            },
          });
        },
      },
      after: () => {
        if (vditor) {
          vditorRef.current = vditor;
          isInitializedRef.current = true;
          setIsReady(true);

          // Set initial content
          vditor.setValue(content || '');

          // Call onEditorReady with mock editor interface
          if (onEditorReady) {
            onEditorReady({
              blocksToMarkdownLossy: async () => vditor.getValue(),
            });
          }
        }
      },
      input: (value: string) => {
        // Auto-save on input with debouncing handled by parent
        onChange(value);
      },
      blur: (value: string) => {
        // Ensure save on blur
        onChange(value);
      },
    });

    return () => {
      if (vditorRef.current) {
        vditorRef.current.destroy();
        vditorRef.current = null;
        isInitializedRef.current = false;
        setIsReady(false);
      }
    };
  }, []); // Only run once on mount

  // Handle content updates when taskId changes
  useEffect(() => {
    if (!isReady || !vditorRef.current) return;

    // Check if this is a new task
    if (taskId !== lastTaskIdRef.current) {
      lastTaskIdRef.current = taskId;
      
      // Update content when task changes
      const currentValue = vditorRef.current.getValue();
      if (currentValue !== content) {
        vditorRef.current.setValue(content || '');
      }
    }
  }, [taskId, content, isReady]);

  // Handle readonly mode changes
  useEffect(() => {
    if (!isReady || !vditorRef.current) return;

    if (readOnly) {
      vditorRef.current.disabled();
    } else {
      vditorRef.current.enable();
    }
  }, [readOnly, isReady]);

  return (
    <div 
      ref={containerRef}
      className="vditor-container"
      style={{ 
        height: '100%',
        minHeight: '400px',
      }}
    />
  );
};

export default VditorEditor;

