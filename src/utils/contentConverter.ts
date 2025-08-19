// Content converter utility for migrating from Editor.js to BlockNote format

interface EditorJSParagraphData {
  text: string;
}

interface EditorJSHeaderData {
  text: string;
  level: number;
}

interface EditorJSListData {
  style: 'ordered' | 'unordered';
  items: string[];
}

interface EditorJSChecklistItem {
  text: string;
  checked: boolean;
}

interface EditorJSChecklistData {
  items: EditorJSChecklistItem[];
}

interface EditorJSCodeData {
  code: string;
  language?: string;
}

interface EditorJSImageData {
  file?: { url: string };
  url?: string;
  caption?: string;
}

interface EditorJSTableData {
  content: string[][];
}

export interface EditorJSBlock {
  id?: string;
  type: string;
  data: EditorJSParagraphData | EditorJSHeaderData | EditorJSListData | 
         EditorJSChecklistData | EditorJSCodeData | EditorJSImageData | 
         EditorJSTableData | Record<string, unknown>;
  tunes?: Record<string, unknown>;
}

export interface EditorJSData {
  time?: number;
  blocks: EditorJSBlock[];
  version?: string;
}

export interface BlockNoteTextContent {
  type: 'text';
  text: string;
  styles?: Record<string, boolean>;
}

export interface BlockNoteBlock {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: BlockNoteTextContent[];
  children?: BlockNoteBlock[];
}

/**
 * Convert Editor.js data to BlockNote format
 * This function handles the migration of existing task content
 */
export function convertEditorJSToBlockNote(editorJSContent: string): BlockNoteBlock[] {
  if (!editorJSContent || editorJSContent.trim() === '') {
    return [];
  }

  try {
    let editorJSData: EditorJSData;
    
    // Try to parse as JSON
    try {
      editorJSData = JSON.parse(editorJSContent);
    } catch (error) {
      // If not valid JSON, treat as plain text
      return [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: editorJSContent.replace(/<[^>]*>/g, '') // Strip HTML tags
        }]
      }];
    }

    if (!editorJSData.blocks || !Array.isArray(editorJSData.blocks)) {
      return [];
    }

    return editorJSData.blocks.map(convertEditorJSBlock);
  } catch (error) {
    console.error('Error converting Editor.js content to BlockNote:', error);
    // Fallback: treat as plain text
    return [{
      type: 'paragraph',
      content: [{
        type: 'text',
        text: editorJSContent.replace(/<[^>]*>/g, '')
      }]
    }];
  }
}

/**
 * Convert a single Editor.js block to BlockNote format
 */
function convertEditorJSBlock(block: EditorJSBlock): BlockNoteBlock {
  switch (block.type) {
    case 'paragraph': {
      const data = block.data as EditorJSParagraphData;
      return {
        type: 'paragraph',
        content: data.text ? parseInlineContent(data.text) : []
      };
    }

    case 'header': {
      const data = block.data as EditorJSHeaderData;
      const level = Math.min(Math.max(data.level || 1, 1), 3); // BlockNote supports h1-h3
      return {
        type: 'heading',
        props: {
          level: level
        },
        content: data.text ? parseInlineContent(data.text) : []
      };
    }

    case 'list': {
      const data = block.data as EditorJSListData;
      return {
        type: data.style === 'ordered' ? 'numberedListItem' : 'bulletListItem',
        content: data.items ? 
          data.items.map((item: string) => ({
            type: 'text',
            text: item.replace(/<[^>]*>/g, '') // Strip HTML
          } as BlockNoteTextContent)) : []
      };
    }

    case 'checklist': {
      const data = block.data as EditorJSChecklistData;
      // Convert checklist items to numbered list with checkmarks
      return {
        type: 'bulletListItem',
        content: data.items ? 
          data.items.map((item: EditorJSChecklistItem) => ({
            type: 'text',
            text: `${item.checked ? '✓' : '○'} ${item.text || ''}`
          } as BlockNoteTextContent)) : []
      };
    }

    case 'code': {
      const data = block.data as EditorJSCodeData;
      return {
        type: 'codeBlock',
        props: {
          language: data.language || 'javascript'
        },
        content: [{
          type: 'text',
          text: data.code || ''
        }]
      };
    }

    case 'image': {
      const data = block.data as EditorJSImageData;
      return {
        type: 'image',
        props: {
          url: data.file?.url || data.url || '',
          caption: data.caption || ''
        }
      };
    }

    case 'table': {
      const data = block.data as EditorJSTableData;
      // Convert table to paragraph with structured text representation
      if (data.content && Array.isArray(data.content)) {
        const tableText = data.content
          .map((row: string[]) => row.join(' | '))
          .join('\n');
        return {
          type: 'paragraph',
          content: [{
            type: 'text',
            text: `表格:\n${tableText}`
          }]
        };
      }
      return {
        type: 'paragraph',
        content: [{
          type: 'text',
          text: '[表格内容]'
        }]
      };
    }

    default:
      // For unknown block types, convert to paragraph
      return {
        type: 'paragraph',
        content: [{
          type: 'text',
          text: `[未知内容类型: ${block.type}]`
        }]
      };
  }
}

/**
 * Parse inline content with basic formatting
 */
function parseInlineContent(text: string): BlockNoteTextContent[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Simple HTML tag removal and text extraction
  const cleanText = text.replace(/<[^>]*>/g, '');
  
  if (cleanText.trim() === '') {
    return [];
  }

  return [{
    type: 'text',
    text: cleanText
  }];
}

/**
 * Check if content is in Editor.js format
 */
export function isEditorJSFormat(content: string): boolean {
  if (!content || content.trim() === '') {
    return false;
  }

  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' && 
           Array.isArray(parsed.blocks) && 
           typeof parsed.time === 'number';
  } catch {
    return false;
  }
}

 