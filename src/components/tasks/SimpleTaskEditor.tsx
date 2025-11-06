import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, ArrowLeftRight, Repeat, X } from 'lucide-react';
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

// Lightweight overlay to highlight current match under the textarea
const HighlightOverlay: React.FC<{
  content: string;
  match: { start: number; end: number };
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}> = ({ content, match, textareaRef }) => {
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = textareaRef?.current;
    const target = innerRef.current;
    if (!el || !target) return;
    const sync = () => {
      target.style.transform = `translateY(-${el.scrollTop}px)`;
    };
    sync();
    el.addEventListener('scroll', sync);
    return () => {
      el.removeEventListener('scroll', sync);
    };
  }, [textareaRef]);

  const before = content.slice(0, match.start);
  const middle = content.slice(match.start, match.end);
  const after = content.slice(match.end);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <div
        ref={innerRef}
        className="px-3 pt-0 pb-3 text-sm leading-relaxed whitespace-pre-wrap font-inherit"
        style={{ color: 'transparent' }}
      >
        <span>{before}</span>
        <span className="bg-yellow-400/30 rounded-sm">{middle}</span>
        <span>{after}</span>
      </div>
    </div>
  );
};

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

  // IME composition state to handle Chinese input method
  const [isComposing, setIsComposing] = useState(false);
  const compositionValueRef = useRef<string>('');

  // Find/Replace state
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);

  // Find bar docking position: top or bottom (sticky)
  const [findDock, setFindDock] = useState<'top' | 'bottom'>('top');
  const [showReplace, setShowReplace] = useState(false);

  type MatchPos = { start: number; end: number };
  const matches: MatchPos[] = useMemo(() => {
    if (!findQuery) return [];
    const result: MatchPos[] = [];
    const haystack = markdownContent;
    const needle = findQuery;
    let from = 0;
    while (from < haystack.length) {
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
    
    // During IME composition, only update local state, don't call onChange
    if (isComposing) {
      compositionValueRef.current = newMarkdown;
      setMarkdownContent(newMarkdown);
      return;
    }
    
    setMarkdownContent(newMarkdown);
    
    // For simplicity, we'll store the markdown as plain text
    // This makes it easier to edit and doesn't require complex JSON conversion
    onChange(newMarkdown);
  }, [onChange, isComposing]);

  // Handle IME composition events
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    const newMarkdown = e.currentTarget.value;
    
    // Update both local state and call onChange when composition ends
    setMarkdownContent(newMarkdown);
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
    // 当查找输入框有焦点时，不主动改变焦点，只更新文本选区
    const active = document.activeElement as HTMLElement | null;
    const isTypingInFind = active && active.tagName === 'INPUT';
    const idx = Math.min(currentMatchIndex < 0 ? 0 : currentMatchIndex, matches.length - 1);
    if (isTypingInFind) {
      // 仅更新选区，不切焦点
      const el = textareaRef.current;
      if (el) {
        const { start, end } = matches[idx];
        el.setSelectionRange(start, end);
      }
      setCurrentMatchIndex(idx);
    } else {
      selectMatch(idx);
    }
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

  // Note: We intentionally avoid global Cmd/Ctrl+F interception to keep browser find intact
  // unless the textarea itself is focused (handled by onKeyDown on textarea).

  const isBottomDocked = isFindOpen && findDock === 'bottom';
  return (
    <div className={`h-full w-full flex-1 flex flex-col relative ${isBottomDocked ? 'pb-16' : ''}`}>
      {isFindOpen && (
        <div className={`sticky z-10 ${findDock === 'top' ? 'top-0' : 'bottom-0'} py-1`}> 
          <div className="mx-2 my-1 rounded-md border border-border bg-muted shadow-sm px-2 py-1">
          <div className="flex items-center gap-1 flex-nowrap w-full min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setShowReplace((v) => !v)}
              title={showReplace ? '收起替换' : '展开替换'}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showReplace ? 'rotate-180' : ''}`} />
            </Button>
            <Input
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              placeholder="查找"
              className="h-8 px-2 flex-1 min-w-0"
              autoFocus
            />
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="secondary" size="icon" className="h-8 w-8" onClick={goToPrevMatch} disabled={matches.length === 0} title="上一个">
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="icon" className="h-8 w-8" onClick={goToNextMatch} disabled={matches.length === 0} title="下一个">
                <ChevronDown className="h-4 w-4" />
              </Button>
              <div className="text-xs text-muted-foreground whitespace-nowrap px-1">
                {matches.length > 0 ? `${currentMatchIndex + 1}/${matches.length}` : '无结果'}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFindOpen(false)} title="关闭">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {showReplace && (
            <div className="mt-1 flex items-center gap-1 flex-nowrap w-full min-w-0">
              <Input
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                placeholder="替换为"
                className="h-8 px-2 flex-1 min-w-0"
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
              <Button size="icon" className="h-8 w-8" onClick={replaceCurrent} disabled={readOnly || matches.length === 0} title="替换当前">
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
              <Button size="icon" className="h-8 w-8" variant="secondary" onClick={replaceAll} disabled={readOnly || matches.length === 0} title="全部替换">
                <Repeat className="h-4 w-4" />
              </Button>
            </div>
          )}
          </div>
        </div>
      )}

      <div className="relative flex-1">
        {/* Highlight overlay for current match (below textarea) */}
        {isFindOpen && currentMatchIndex >= 0 && matches.length > 0 && (
          <HighlightOverlay
            content={markdownContent}
            match={matches[currentMatchIndex]}
            textareaRef={textareaRef}
          />
        )}

        <Textarea
          ref={textareaRef}
          value={markdownContent}
          onChange={handleChange}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
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
          className="relative z-10 flex-1 w-full resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm leading-relaxed px-3 pt-0 pb-3 bg-transparent"
          style={{ 
            height: '100%',
            minHeight: '400px'
          }}
        />
      </div>

      {/* sticky find bar rendered above; floating panel removed for clarity */}
    </div>
  );
};

export default SimpleTaskEditor;