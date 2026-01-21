import { Task } from '@/types/task';

// 中文分词正则
const CHINESE_WORD_REGEX = /[\u4e00-\u9fff]+/g;
// 英文单词正则
const ENGLISH_WORD_REGEX = /[a-zA-Z]+/g;
// 数字正则
const NUMBER_REGEX = /\d+/g;

// 搜索匹配结果接口
export interface SearchMatch {
  task: Task;
  score: number;
  matchedFields: string[];
  highlights: {
    title: string;
    description?: string;
  };
}

// 分词函数
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  
  // 提取中文词汇
  const chineseWords = text.match(CHINESE_WORD_REGEX) || [];
  chineseWords.forEach(word => {
    // 中文按字符分割
    tokens.push(...word.split(''));
    // 也保留整个词
    if (word.length > 1) {
      tokens.push(word);
    }
  });
  
  // 提取英文单词
  const englishWords = text.match(ENGLISH_WORD_REGEX) || [];
  tokens.push(...englishWords.map(word => word.toLowerCase()));
  
  // 提取数字
  const numbers = text.match(NUMBER_REGEX) || [];
  tokens.push(...numbers);
  
  // 去重
  return [...new Set(tokens)];
}

// 计算编辑距离（用于模糊匹配）
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i] + 1, // deletion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// 模糊匹配函数
function fuzzyMatch(query: string, target: string, threshold = 0.7): boolean {
  if (!query || !target) return false;
  
  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();
  
  // 完全匹配
  if (targetLower.includes(queryLower)) return true;
  
  // 编辑距离模糊匹配
  const maxLength = Math.max(query.length, target.length);
  const distance = levenshteinDistance(queryLower, targetLower);
  const similarity = 1 - distance / maxLength;
  
  return similarity >= threshold;
}

// 高亮文本函数
export function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;
  
  const queryTokens = tokenize(query);
  let highlightedText = text;
  
  queryTokens.forEach(token => {
    if (token.length >= 1) {
      const regex = new RegExp(`(${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>');
    }
  });
  
  return highlightedText;
}

// 计算匹配分数
function calculateMatchScore(task: Task, queryTokens: string[]): { score: number; matchedFields: string[] } {
  let score = 0;
  const matchedFields: string[] = [];
  
  const titleTokens = tokenize(task.title);
  const descTokens = task.description ? tokenize(task.description) : [];
  const projectTokens = task.project ? tokenize(task.project) : [];
  
  // 先检查简单的全文包含匹配（降低门槛）
  const queryLower = queryTokens.join(' ').toLowerCase();
  const titleLower = task.title.toLowerCase();
  const descLower = task.description?.toLowerCase() || '';
  const projectLower = task.project?.toLowerCase() || '';
  
  // 简单包含匹配 - 更宽松的匹配规则
  queryTokens.forEach(queryToken => {
    const tokenLower = queryToken.toLowerCase();
    
    // 标题简单包含匹配
    if (titleLower.includes(tokenLower)) {
      score += 8;
      if (!matchedFields.includes('title')) {
        matchedFields.push('title');
      }
    }
    
    // 描述简单包含匹配
    if (descLower.includes(tokenLower)) {
      score += 4;
      if (!matchedFields.includes('description')) {
        matchedFields.push('description');
      }
    }
    
    // 项目简单包含匹配
    if (projectLower.includes(tokenLower)) {
      score += 2;
      if (!matchedFields.includes('project')) {
        matchedFields.push('project');
      }
    }
  });
  
  // 如果已经有简单匹配，则进行更精确的分词匹配
  if (score > 0) {
    queryTokens.forEach(queryToken => {
      titleTokens.forEach(titleToken => {
        if (titleToken.includes(queryToken) || queryToken.includes(titleToken)) {
          score += 2; // 额外加分
        } else if (fuzzyMatch(queryToken, titleToken, 0.7)) { // 降低模糊匹配阈值
          score += 1;
        }
      });
      
      // 描述分词匹配
      descTokens.forEach(descToken => {
        if (descToken.includes(queryToken) || queryToken.includes(descToken)) {
          score += 1;
        } else if (fuzzyMatch(queryToken, descToken, 0.7)) {
          score += 0.5;
        }
      });
    });
  }
  
  // 加分项
  if (task.completed) score += 0.5;
  if (task.date) score += 0.5;
  
  return { score, matchedFields };
}

// 主搜索函数
export function searchTasks(tasks: Task[], query: string, options: {
  minScore?: number;
  maxResults?: number;
  includeFuzzy?: boolean;
} = {}): SearchMatch[] {
  const {
    minScore = 0.5, // 降低默认最小分数
    maxResults = 50,
    includeFuzzy = true
  } = options;
  
  if (!query.trim()) return [];
  
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];
  
  const results: SearchMatch[] = [];
  
  tasks.forEach(task => {
    // 跳过已删除和已放弃的任务
    if (task.deleted || task.abandoned) return;
    
    const { score, matchedFields } = calculateMatchScore(task, queryTokens);
    
    if (score >= minScore) {
      results.push({
        task,
        score,
        matchedFields,
        highlights: {
          title: highlightText(task.title, query),
          description: task.description ? highlightText(task.description, query) : undefined
        }
      });
    }
  });
  
  // 按分数排序并限制结果数量
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

// 搜索建议函数
export function getSearchSuggestions(tasks: Task[], query: string, maxSuggestions = 5): string[] {
  if (!query.trim()) return [];
  
  const queryLower = query.toLowerCase();
  const suggestions = new Set<string>();
  
  tasks.forEach(task => {
    if (task.deleted || task.abandoned) return;
    
    // 从任务标题提取建议
    const titleTokens = tokenize(task.title);
    titleTokens.forEach(token => {
      if (token.toLowerCase().startsWith(queryLower) && token.length > queryLower.length) {
        suggestions.add(token);
      }
    });
    
    // 从任务描述提取建议
    if (task.description) {
      const descTokens = tokenize(task.description);
      descTokens.forEach(token => {
        if (token.toLowerCase().startsWith(queryLower) && token.length > queryLower.length) {
          suggestions.add(token);
        }
      });
    }
  });
  
  return Array.from(suggestions).slice(0, maxSuggestions);
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}