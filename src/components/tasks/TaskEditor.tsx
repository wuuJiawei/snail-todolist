import React, { useMemo, useEffect, useCallback, useRef } from 'react';
import { BlockNoteView } from '@blocknote/shadcn';
import { useCreateBlockNote } from '@blocknote/react';
import { PartialBlock, BlockNoteEditor } from '@blocknote/core';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { convertEditorJSToBlockNote, isEditorJSFormat } from '@/utils/contentConverter';

// Import BlockNote styles
import '@blocknote/core/fonts/inter.css';
import '@blocknote/shadcn/style.css';
// Import custom BlockNote overrides to fix layout issues
import '@/styles/blocknote-overrides.css';

interface TaskEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
  taskId?: string;
  onEditorReady?: (editor: BlockNoteEditor) => void;
}

const TaskEditor: React.FC<TaskEditorProps> = ({ 
  content, 
  onChange, 
  readOnly = false, 
  taskId,
  onEditorReady
}) => {
  const { user } = useAuth();

  // Convert Editor.js content to BlockNote format if needed
  const initialBlocks = useMemo(() => {
    if (!content || content.trim() === '') {
      // BlockNote requires at least one block, so return an empty paragraph
      return [{
        type: 'paragraph',
        content: []
      }] as PartialBlock[];
    }

    // Check if content is in Editor.js format and convert it
    if (isEditorJSFormat(content)) {
      const convertedBlocks = convertEditorJSToBlockNote(content);
      // Convert to BlockNote's PartialBlock format
      const blocks = convertedBlocks.map(block => ({
        type: block.type,
        props: block.props || {},
        content: block.content || []
      })) as PartialBlock[];
      
      // Ensure we have at least one block
      return blocks.length > 0 ? blocks : [{
        type: 'paragraph',
        content: []
      }] as PartialBlock[];
    }

    // Try to parse as BlockNote JSON format
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as PartialBlock[];
      }
    } catch (error) {
      // If not valid JSON, treat as plain text
      return [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: content
        }]
      }] as PartialBlock[];
    }

    // Fallback: return empty paragraph if all else fails
    return [{
      type: 'paragraph',
      content: []
    }] as PartialBlock[];
  }, [content]);

  // Memoize upload function to prevent editor recreation
  const uploadFile = useCallback(async (file: File) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }, [user]);

  // Create BlockNote editor instance with stable configuration
  const editor = useCreateBlockNote({
    initialContent: initialBlocks,
    uploadFile
  });

  // Track if content needs to be updated
  const lastTaskIdRef = useRef<string | undefined>(undefined);
  const isContentUpdateNeededRef = useRef(false);

  // Update editor content when taskId changes
  useEffect(() => {
    if (taskId !== lastTaskIdRef.current) {
      lastTaskIdRef.current = taskId;
      isContentUpdateNeededRef.current = true;
      
      // Replace editor content instead of recreating editor
      if (editor && initialBlocks.length > 0) {
        editor.replaceBlocks(editor.document, initialBlocks);
        isContentUpdateNeededRef.current = false;
      }
    }
  }, [taskId, editor, initialBlocks]);

  // Handle content changes with debouncing for better performance
  const handleChange = useCallback(async () => {
    // Skip content updates if we're in the middle of task switching
    if (isContentUpdateNeededRef.current) {
      return;
    }
    
    try {
      const blocks = editor.document;
      const jsonContent = JSON.stringify(blocks);
      onChange(jsonContent);
    } catch (error) {
      console.error('Error saving content:', error);
    }
  }, [editor, onChange]);

  // Ensure editor content is updated if needed after render
  useEffect(() => {
    if (isContentUpdateNeededRef.current && editor && initialBlocks.length > 0) {
      editor.replaceBlocks(editor.document, initialBlocks);
      isContentUpdateNeededRef.current = false;
    }
  });

  // Call onEditorReady when editor is created
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  return (
    <div className="h-full flex-1 flex flex-col pb-12 task-editor-container relative">
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        editable={!readOnly}
        theme="light"
        className="min-h-[200px] [&_.ProseMirror]:px-3 max-w-full overflow-x-hidden"
        data-placeholder="输入任务内容..."
        shadCNComponents={{
          // Pass modified ShadCN components from your project here.
          // Otherwise, the default ShadCN components will be used.
        }}
      />
    </div>
  );
};

export default TaskEditor;
