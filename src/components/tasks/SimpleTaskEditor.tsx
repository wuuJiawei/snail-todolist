import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  onEditorReady?: (editor: { blocksToMarkdownLossy: () => Promise<string> }) => void;
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

  // Find/Replace state
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);

  // Draggable find panel position; null = default top-right
  const [panelPos, setPanelPos] = useState<{ left: number; top: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  type MatchPos = { start: number; end: number };
  const matches: MatchPos[] = useMemo(() => {
    if (!findQuery) return [];
    const result: MatchPos[] = [];
    const haystack = markdownContent;
    const needle = findQuery;
    let from = 0;
    while (true) {
      const idx = haystack.indexOf(needle, from);
      if (idx === -1) break;
      result.push({ start: idx, end: idx + needle.length });
      from = idx + Math.max(needle.length, 1);
      if (result.length > 5000) break; // safety guard
    }
    return result;
  }, [markdownContent, findQuery]);

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

  // Keep latest content in ref so external callers always get up-to-date markdown
  const contentRef = useRef(markdownContent);
  useEffect(() => {
    contentRef.current = markdownContent;
  }, [markdownContent]);

  // Stable mock editor for compatibility with existing copy functionality
  const mockEditor = useMemo(() => ({
    blocksToMarkdownLossy: async () => contentRef.current
  }), []);

  // Call onEditorReady once with a stable editor
  const onReadyCalledRef = useRef(false);
  useEffect(() => {
    if (!onReadyCalledRef.current && onEditorReady) {
      onEditorReady(mockEditor);
      onReadyCalledRef.current = true;
    }
  }, [onEditorReady, mockEditor]);

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

  

  // Helpers to select match
  const selectMatch = useCallback((index: number) => {
    const el = textareaRef.current;
    if (!el) return;
    if (index < 0 || index >= matches.length) return;
    const { start, end } = matches[index];
    el.focus();
    el.setSelectionRange(start, end);
    // Ensure visible
    const beforeText = el.value.slice(0, start);
    const lineBreaks = (beforeText.match(/\n/g) || []).length;
    // Best-effort scroll by lines
    const approxLineHeight = 18; // px
    el.scrollTop = Math.max(0, (lineBreaks - 3) * approxLineHeight);
    setCurrentMatchIndex(index);
  }, [matches]);

  const goToNextMatch = useCallback(() => {
    if (matches.length === 0) return;
    const next = currentMatchIndex < 0 ? 0 : (currentMatchIndex + 1) % matches.length;
    selectMatch(next);
  }, [matches, currentMatchIndex, selectMatch]);

  const goToPrevMatch = useCallback(() => {
    if (matches.length === 0) return;
    const prev = currentMatchIndex < 0 ? matches.length - 1 : (currentMatchIndex - 1 + matches.length) % matches.length;
    selectMatch(prev);
  }, [matches, currentMatchIndex, selectMatch]);

  // Keyboard shortcuts for find/replace within textarea (placed after helpers to avoid TDZ)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMeta = e.metaKey || e.ctrlKey;
    if (!isMeta) return;

    const key = e.key.toLowerCase();
    if (key === 'f') {
      e.preventDefault();
      setIsFindOpen(true);
      // If there is a selection, prefill find with it
      const el = textareaRef.current;
      if (el) {
        const sel = el.value.substring(el.selectionStart, el.selectionEnd);
        if (sel) setFindQuery(sel);
      }
      // Move to next match immediately
      setTimeout(() => {
        goToNextMatch();
      }, 0);
    } else if (key === 'g') {
      e.preventDefault();
      if (e.shiftKey) {
        goToPrevMatch();
      } else {
        goToNextMatch();
      }
    }
  }, [goToNextMatch, goToPrevMatch]);

  // Update selection when query or content changes
  useEffect(() => {
    if (!isFindOpen) return;
    if (matches.length === 0) {
      setCurrentMatchIndex(-1);
      return;
    }
    // Keep within range
    const idx = Math.min(currentMatchIndex < 0 ? 0 : currentMatchIndex, matches.length - 1);
    selectMatch(idx);
  }, [matches, isFindOpen, currentMatchIndex, selectMatch]);

  const replaceCurrent = useCallback(() => {
    if (readOnly) return;
    if (currentMatchIndex < 0 || currentMatchIndex >= matches.length) return;
    const { start, end } = matches[currentMatchIndex];
    const before = markdownContent.slice(0, start);
    const after = markdownContent.slice(end);
    const newContent = before + replaceQuery + after;
    setMarkdownContent(newContent);
    onChange(newContent);

    // After replacing, rebuild matches and select the next occurrence at same position
    setTimeout(() => {
      // Recompute using latest state via set state callbacks would be safer, but simple delay suffices here
      const el = textareaRef.current;
      if (el && replaceQuery) {
        const newCaret = start + replaceQuery.length;
        el.setSelectionRange(newCaret, newCaret);
      }
      // Move to next match relative to replaced segment
      setCurrentMatchIndex(-1);
      goToNextMatch();
    }, 0);
  }, [readOnly, currentMatchIndex, matches, markdownContent, replaceQuery, onChange, goToNextMatch]);

  const replaceAll = useCallback(() => {
    if (readOnly) return;
    if (!findQuery) return;
    if (findQuery === replaceQuery) return;
    const newContent = markdownContent.split(findQuery).join(replaceQuery);
    setMarkdownContent(newContent);
    onChange(newContent);
    setCurrentMatchIndex(-1);
  }, [readOnly, findQuery, replaceQuery, markdownContent, onChange]);

  // Enable global Cmd/Ctrl+F to open our find panel (when component mounted)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFindOpen(true);
        setTimeout(() => {
          goToNextMatch();
        }, 0);
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true } as AddEventListenerOptions);
  }, [goToNextMatch]);

  // Drag handlers for find panel
  const onDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!panelRef.current) return;
    const panelRect = panelRef.current.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    // Compute cursor offset within panel (viewport-based)
    const offsetX = e.clientX - panelRect.left;
    const offsetY = e.clientY - panelRect.top;
    dragStateRef.current = { offsetX, offsetY };
    // Attach listeners
    const onMove = (ev: MouseEvent) => {
      if (!dragStateRef.current) return;
      const el = panelRef.current;
      const parentRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight } as DOMRect;
      if (!el) return;
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      const maxLeft = (parentRect.width ?? window.innerWidth) - width - 4;
      const maxTop = (parentRect.height ?? window.innerHeight) - height - 4;
      // Transform viewport coords to container-relative coords
      let nextLeft = ev.clientX - parentRect.left - dragStateRef.current.offsetX;
      let nextTop = ev.clientY - parentRect.top - dragStateRef.current.offsetY;
      nextLeft = Math.max(4, Math.min(nextLeft, Math.max(4, maxLeft)));
      nextTop = Math.max(4, Math.min(nextTop, Math.max(4, maxTop)));
      setPanelPos({ left: nextLeft, top: nextTop });
    };
    const onUp = () => {
      dragStateRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, { once: true });
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full flex-1 flex flex-col relative">
      <Textarea
        ref={textareaRef}
        value={markdownContent}
        onChange={handleChange}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
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

      {isFindOpen && (
        <div
          ref={panelRef}
          className="absolute z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow rounded-md border p-2 w-[min(480px,calc(100%-16px))]"
          style={panelPos ? { left: panelPos.left, top: panelPos.top } : { right: 8, top: 8 }}
        >
          <div className="flex gap-2 items-center">
            <div
              onMouseDown={onDragStart}
              className="shrink-0 w-4 h-8 flex items-center justify-center cursor-move select-none text-muted-foreground"
              title="拖拽移动"
            >
              ⠿
            </div>
            <Input
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              placeholder="查找"
              className="h-8 px-2"
              autoFocus
            />
            <Button variant="secondary" size="sm" className="h-8" onClick={goToPrevMatch} disabled={matches.length === 0}>上一个</Button>
            <Button variant="secondary" size="sm" className="h-8" onClick={goToNextMatch} disabled={matches.length === 0}>下一个</Button>
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {matches.length > 0 ? `${currentMatchIndex + 1}/${matches.length}` : '0/0'}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFindOpen(false)}>
              ✕
            </Button>
          </div>
          <div className="mt-2 flex gap-2 items-center">
            <Input
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              placeholder="替换为"
              className="h-8 px-2"
              disabled={readOnly}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  replaceCurrent();
                } else if (e.key === 'Enter' && e.shiftKey) {
                  e.preventDefault();
                  replaceAll();
                }
              }}
            />
            <Button size="sm" className="h-8" onClick={replaceCurrent} disabled={readOnly || matches.length === 0}>替换</Button>
            <Button size="sm" className="h-8" variant="destructive" onClick={replaceAll} disabled={readOnly || matches.length === 0}>全部替换</Button>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            快捷键：Cmd/Ctrl+F 查找，Cmd/Ctrl+G 下一个，Shift+Cmd/Ctrl+G 上一个；在“替换为”里 Enter=替换，Shift+Enter=全部替换
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleTaskEditor;