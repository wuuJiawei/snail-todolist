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
  
  // 标志位：区分程序化更新和用户输入
  const isProgrammaticChangeRef = useRef(false);
  
  // 保存最新的content值，避免闭包陷阱
  const contentRef = useRef(content);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

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
          lineNumber: false,
        },
      },
      upload: {
        accept: 'image/*',
        // 关键修复：添加format函数，确保图片以正确的markdown格式插入
        format: (files: File[], responseText: string) => {
          try {
            const response = JSON.parse(responseText);
            if (response.code === 0 && response.data && response.data.succMap) {
              // 构建markdown图片语法
              let result = '';
              Object.entries(response.data.succMap).forEach(([fileName, url]) => {
                // 使用标准的markdown图片语法: ![alt text](url)
                result += `![${fileName}](${url})\n`;
              });
              return result;
            }
          } catch (error) {
            console.error('Error formatting upload response:', error);
          }
          return '';
        },
        handler: async (files: File[]) => {
          // 关键修复：保持文件名和URL的正确对应关系
          const results = await Promise.all(
            files.map(async (file) => {
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
                  filename: file.name,
                  original_name: file.name,
                  type: file.type,
                  size: file.size,
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

                return { fileName: file.name, url, success: true };
              } catch (error) {
                console.error('Upload failed:', error);
                toast({
                  title: "图片上传失败",
                  description: file.name,
                  variant: "destructive",
                });
                return { fileName: file.name, url: null, success: false };
              }
            })
          );

          // 构建succMap，只包含成功的上传，保持文件名和URL的正确对应
          const succMap: Record<string, string> = {};
          const errFiles: string[] = [];

          results.forEach((result) => {
            if (result.success && result.url) {
              succMap[result.fileName] = result.url;
            } else {
              errFiles.push(result.fileName);
            }
          });

          // Return success JSON for Vditor
          return JSON.stringify({
            msg: '',
            code: 0,
            data: {
              errFiles,
              succMap,
            },
          });
        },
      },
      after: () => {
        if (vditor) {
          vditorRef.current = vditor;
          isInitializedRef.current = true;
          setIsReady(true);

          // Set initial content (程序化更新，不触发onChange)
          isProgrammaticChangeRef.current = true;
          vditor.setValue(contentRef.current || '');
          // 使用setTimeout确保setValue完成后再重置标志位
          setTimeout(() => {
            isProgrammaticChangeRef.current = false;
          }, 50);

          // Call onEditorReady with mock editor interface
          if (onEditorReady) {
            onEditorReady({
              blocksToMarkdownLossy: async () => vditor.getValue(),
            });
          }
        }
      },
      input: (value: string) => {
        // 只在用户输入时触发onChange，忽略程序化的setValue
        if (!isProgrammaticChangeRef.current) {
          onChange(value);
        }
      },
      blur: (value: string) => {
        // 只在用户输入时触发onChange，忽略程序化的setValue
        if (!isProgrammaticChangeRef.current) {
          onChange(value);
        }
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
  // 关键修复：只依赖taskId，不依赖content，避免每次content更新都触发setValue
  useEffect(() => {
    if (!isReady || !vditorRef.current) return;

    // Check if this is a new task
    if (taskId !== lastTaskIdRef.current) {
      lastTaskIdRef.current = taskId;
      
      // Update content when task changes (程序化更新，不触发onChange)
      isProgrammaticChangeRef.current = true;
      vditorRef.current.setValue(contentRef.current || '');
      // 使用setTimeout确保setValue完成后再重置标志位
      setTimeout(() => {
        isProgrammaticChangeRef.current = false;
      }, 50);
    }
  }, [taskId, isReady]); // 移除content依赖，避免循环更新

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

