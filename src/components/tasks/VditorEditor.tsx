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
  const attachmentsRef = useRef<TaskAttachment[]>(attachments);
  
  // 标志位：区分程序化更新和用户输入
  const isProgrammaticChangeRef = useRef(false);
  
  // 保存最新的content值，避免闭包陷阱
  const contentRef = useRef(content);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

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
        format: () => '',
        handler: async (files: File[]) => {
          const pendingAttachments: TaskAttachment[] = [];

          const results = await Promise.all(
            files.map(async (file) => {
              try {
                toast({
                  title: "正在上传图片...",
                  description: file.name,
                });

                const url = await uploadFile(file);

                const attachment: TaskAttachment = {
                  id: crypto.randomUUID(),
                  url,
                  filename: file.name,
                  original_name: file.name,
                  type: file.type,
                  size: file.size,
                  uploaded_at: new Date().toISOString(),
                };

                pendingAttachments.push(attachment);

                if (vditorRef.current) {
                  const markdown = `![${file.name}](${url})`;
                  const value = vditorRef.current.getValue();
                  const prefix = value && !value.endsWith('\n') ? '\n' : '';
                  vditorRef.current.insertValue(`${prefix}${markdown}\n`);
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

          if (pendingAttachments.length > 0 && onAttachmentsChange) {
            const latest = attachmentsRef.current;
            const merged = [...latest];
            pendingAttachments.forEach((attachment) => {
              if (!merged.find((item) => item.url === attachment.url)) {
                merged.push(attachment);
              }
            });
            attachmentsRef.current = merged;
            onAttachmentsChange(merged);
          }

          const succMap: Record<string, string> = {};
          const errFiles: string[] = [];

          results.forEach((result) => {
            if (result.success && result.url) {
              succMap[result.fileName] = result.url;
            } else {
              errFiles.push(result.fileName);
            }
          });

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

  useEffect(() => {
    if (!isReady || !vditorRef.current) return;

    const editorElement = vditorRef.current.vditor?.ir?.element;
    if (!editorElement) return;

    const sanitizeCopiedText = (value: string) => {
      return value
        .replace(/\r\n/g, "\n")
        .replace(/\n{2,}/g, "\n")
        .replace(/\\([`*_{}\[\]()#+\-.!\\])/g, "$1")
        .trimEnd();
    };

    const handleCopy = (event: ClipboardEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        return;
      }

      const selectedText = selection.toString();
      if (!selectedText) {
        return;
      }

      const sanitizedText = sanitizeCopiedText(selectedText);
      const markdownValue = sanitizeCopiedText(vditorRef.current?.getValue?.() ?? sanitizedText);

      event.preventDefault();
      event.clipboardData?.setData('text/plain', sanitizedText);
      event.clipboardData?.setData('text/markdown', markdownValue);
    };

    editorElement.addEventListener('copy', handleCopy);

    return () => {
      editorElement.removeEventListener('copy', handleCopy);
    };
  }, [isReady]);

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

