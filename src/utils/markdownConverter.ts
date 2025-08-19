// Utility to convert BlockNote JSON content to markdown and vice versa

interface BlockNoteTextContent {
  type: 'text';
  text: string;
  styles?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    code?: boolean;
  };
}

interface BlockNoteBlock {
  id?: string;
  type: string;
  props?: Record<string, any>;
  content?: BlockNoteTextContent[];
  children?: BlockNoteBlock[];
}

/**
 * Convert BlockNote JSON content to markdown
 */
export function blockNoteToMarkdown(content: string): string {
  if (!content || content.trim() === '') {
    return '';
  }

  try {
    // Try to parse as BlockNote JSON
    const blocks = JSON.parse(content);
    if (!Array.isArray(blocks)) {
      return content; // Return as-is if not valid BlockNote format
    }

    return blocks.map(blockToMarkdown).join('\n\n');
  } catch (error) {
    // If parsing fails, return content as-is (might be plain text or markdown already)
    return content;
  }
}

/**
 * Convert markdown back to plain text (for storage simplicity)
 */
export function markdownToPlainText(markdown: string): string {
  return markdown;
}

/**
 * Convert a single BlockNote block to markdown
 */
function blockToMarkdown(block: BlockNoteBlock): string {
  switch (block.type) {
    case 'paragraph':
      return contentToMarkdown(block.content || []);

    case 'heading':
      const level = block.props?.level || 1;
      const headingPrefix = '#'.repeat(Math.min(level, 6));
      return `${headingPrefix} ${contentToMarkdown(block.content || [])}`;

    case 'bulletListItem':
      return `- ${contentToMarkdown(block.content || [])}`;

    case 'numberedListItem':
      return `1. ${contentToMarkdown(block.content || [])}`;

    case 'checkListItem':
      const checked = block.props?.checked ? 'x' : ' ';
      return `- [${checked}] ${contentToMarkdown(block.content || [])}`;

    case 'codeBlock':
      const language = block.props?.language || '';
      const code = contentToMarkdown(block.content || []);
      return `\`\`\`${language}\n${code}\n\`\`\``;

    case 'image':
      const url = block.props?.url || '';
      const caption = block.props?.caption || block.props?.name || '';
      return `![${caption}](${url})`;

    case 'table':
      // Simple table representation
      return '[Table content]';

    case 'quote':
      return `> ${contentToMarkdown(block.content || [])}`;

    default:
      // For unknown types, just return the text content
      return contentToMarkdown(block.content || []);
  }
}

/**
 * Convert BlockNote text content to markdown with formatting
 */
function contentToMarkdown(content: BlockNoteTextContent[]): string {
  return content.map(item => {
    let text = item.text || '';

    if (item.styles) {
      if (item.styles.bold) text = `**${text}**`;
      if (item.styles.italic) text = `*${text}*`;
      if (item.styles.code) text = `\`${text}\``;
      if (item.styles.strikethrough) text = `~~${text}~~`;
      if (item.styles.underline) text = `<u>${text}</u>`;
    }

    return text;
  }).join('');
}

/**
 * Create a simple markdown-like representation for legacy content
 */
export function createMarkdownFromLegacyContent(content: string): string {
  if (!content || content.trim() === '') {
    return '';
  }

  // Check if it's Editor.js format
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.blocks && Array.isArray(parsed.blocks)) {
      // Convert Editor.js to markdown
      return parsed.blocks.map((block: any) => {
        switch (block.type) {
          case 'paragraph':
            return block.data?.text || '';
          case 'header':
            const level = block.data?.level || 1;
            return `${'#'.repeat(level)} ${block.data?.text || ''}`;
          case 'list':
            const items = block.data?.items || [];
            const prefix = block.data?.style === 'ordered' ? '1.' : '-';
            return items.map((item: string) => `${prefix} ${item}`).join('\n');
          case 'code':
            return `\`\`\`${block.data?.language || ''}\n${block.data?.code || ''}\n\`\`\``;
          default:
            return block.data?.text || '[Unknown content]';
        }
      }).join('\n\n');
    }
  } catch (error) {
    // Not valid JSON, treat as plain text
  }

  return content;
}