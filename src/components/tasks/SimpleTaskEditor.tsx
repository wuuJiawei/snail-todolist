import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { blockNoteToMarkdown, markdownToPlainText, createMarkdownFromLegacyContent } from '@/utils/markdownConverter';
import { addClipboardImageSupport } from '@/utils/clipboardUtils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { TaskAttachment } from '@/types/task';

interface SimpleTaskEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
  taskId?: string;
  onEditorReady?: (editor: any) => void;
  attachments?: TaskAttachment[];
  onAttachmentsChange?: (attachments: TaskAttachment[]) => void;
}

const SimpleTaskEditor: React.FC<SimpleTaskEditorProps> = ({
  content,
  onChange,
  readOnly = false,
  taskId,
  onEditorReady,
  attachments = [],
  onAttachmentsChange
}) => {
  const [markdownContent, setMarkdownContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastTaskIdRef = useRef<string | undefined>(undefined);
  const { toast } = useToast();
  const { user } = useAuth();

  // Convert content to markdown when taskId changes
  useEffect(() => {
    if (taskId !== lastTaskIdRef.current) {
      lastTaskIdRef.current = taskId;
      
      let converted = '';
      if (content) {
        // Try to convert from BlockNote JSON to markdown
        converted = blockNoteToMarkdown(content);
        
        // If blockNoteToMarkdown didn't convert it (returned as-is), try legacy conversion
        if (converted === content && content !== '') {
          converted = createMarkdownFromLegacyContent(content);
        }
      }
      
      setMarkdownContent(converted);
    }
  }, [content, taskId]);

  // Handle textarea content changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMarkdown = e.target.value;
    setMarkdownContent(newMarkdown);
    
    // For simplicity, we'll store the markdown as plain text
    // This makes it easier to edit and doesn't require complex JSON conversion
    onChange(newMarkdown);
  }, [onChange]);

  // Auto-resize textarea
  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
  }, []);

  // Mock editor for compatibility with existing copy functionality
  const mockEditor = {
    blocksToMarkdownLossy: async () => markdownContent
  };

  // Call onEditorReady if provided
  useEffect(() => {
    if (onEditorReady) {
      onEditorReady(mockEditor);
    }
  }, [onEditorReady]);

  // Setup clipboard image support for content textarea
  useEffect(() => {
    if (!textareaRef.current || !user || readOnly || !onAttachmentsChange) return;

    const cleanup = addClipboardImageSupport(textareaRef.current, {
      userId: user.id,
      onUploadStart: () => {
        toast({
          title: "正在上传图片...",
          description: "请稍候",
        });
      },
      onUploadComplete: (attachment) => {
        // Add to attachments
        const newAttachments = [...attachments, attachment];
        onAttachmentsChange(newAttachments);
        
        // Insert image markdown in textarea at cursor position
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const imageMarkdown = `\n![${attachment.original_name}](${attachment.url})\n`;
          
          const newContent = 
            markdownContent.substring(0, start) + 
            imageMarkdown + 
            markdownContent.substring(end);
          
          setMarkdownContent(newContent);
          onChange(newContent);
          
          // Set cursor after the inserted image
          setTimeout(() => {
            if (textarea) {
              const newCursorPos = start + imageMarkdown.length;
              textarea.setSelectionRange(newCursorPos, newCursorPos);
              textarea.focus();
            }
          }, 0);
        }
        
        toast({
          title: "图片上传成功",
          description: `已插入图片: ${attachment.original_name}`,
        });
      },
      onUploadError: (error) => {
        toast({
          title: "图片上传失败",
          description: error,
          variant: "destructive",
        });
      }
    });

    return cleanup;
  }, [user, readOnly, attachments, onAttachmentsChange, markdownContent, onChange, toast]);

  return (
    <div className="h-full w-full flex-1 flex flex-col">
      <Textarea
        ref={textareaRef}
        value={markdownContent}
        onChange={handleChange}
        onInput={handleInput}
        readOnly={readOnly}
        placeholder="输入任务内容... 📋✨

🖼️ 直接粘贴图片 (Ctrl+V) - 让创作更自由
📝 支持 Markdown 格式:
  # 标题
  - 列表项  
  **粗体** *斜体*
  `代码` 
  ```代码块```

💭 为什么选择 textarea？
   大道至简 - 最简单的往往最强大
   没有复杂的富文本编辑器，只有纯粹的文字力量
   专注内容本身，而非格式的束缚 🎯"
        className="flex-1 w-full resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm leading-relaxed px-3 pt-0 pb-3 bg-transparent"
        style={{ 
          height: '100%',
          minHeight: '400px'
        }}
      />
    </div>
  );
};

export default SimpleTaskEditor;