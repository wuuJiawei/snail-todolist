import { Task } from '@/types/task';
import { searchTasks, tokenize } from './searchUtils';

// 创建测试任务数据
export function createTestTasks(): Task[] {
  return [
    {
      id: '1',
      title: '完成项目文档',
      description: '编写项目的详细文档',
      completed: false,
      project: '工作项目'
    },
    {
      id: '2', 
      title: '学习React',
      description: 'Learn React hooks and components',
      completed: false,
      project: 'Study'
    },
    {
      id: '3',
      title: '买菜做饭',
      description: '去超市买菜然后做晚饭',
      completed: true,
      project: '生活'
    }
  ] as Task[];
}

// 调试搜索功能
export function debugSearch(query: string, tasks: Task[] = createTestTasks()): SearchMatch[] {
  console.group(`🔍 搜索调试: "${query}"`);
  
  // 1. 分词测试
  const queryTokens = tokenize(query);
  console.log('📝 查询分词:', queryTokens);
  
  // 2. 任务分词测试
  tasks.forEach((task, index) => {
    const titleTokens = tokenize(task.title);
    const descTokens = task.description ? tokenize(task.description) : [];
    console.log(`📋 任务${index + 1}:`, {
      title: task.title,
      titleTokens,
      description: task.description,
      descTokens
    });
  });
  
  // 3. 搜索结果测试（不同最小分数）
  [0, 1, 3, 5].forEach(minScore => {
    const results = searchTasks(tasks, query, { 
      minScore, 
      maxResults: 10,
      includeFuzzy: true 
    });
    
    console.log(`🎯 最小分数 ${minScore}:`, {
      resultCount: results.length,
      results: results.map(r => ({
        title: r.task.title,
        score: r.score,
        matchedFields: r.matchedFields
      }))
    });
  });
  
  console.groupEnd();
  
  return searchTasks(tasks, query, { minScore: 0, maxResults: 10 });
}

// 简单搜索测试
export function testBasicSearch(): void {
  const tasks = createTestTasks();
  
  console.group('🧪 基础搜索测试');
  
  const testCases = [
    '项目',
    'React', 
    '文档',
    '学习',
    '买菜',
    'doc', // 部分匹配
    '完成', // 中文
    'Learn' // 英文
  ];
  
  testCases.forEach(query => {
    const results = debugSearch(query, tasks);
    console.log(`✅ "${query}": ${results.length} 个结果`);
  });
  
  console.groupEnd();
}

interface WindowWithDebugTools extends Window {
  debugSearch?: typeof debugSearch;
  createTestTasks?: typeof createTestTasks;
  tokenize?: typeof tokenize;
  testBasicSearch?: typeof testBasicSearch;
}

// 在浏览器控制台中使用
if (typeof window !== 'undefined') {
  const win = window as WindowWithDebugTools;
  win.debugSearch = debugSearch;
  win.createTestTasks = createTestTasks;
  win.tokenize = tokenize;
  win.testBasicSearch = testBasicSearch;
  
  console.log('🛠️ 搜索调试工具已加载！');
  console.log('使用方法:');
  console.log('  testBasicSearch() - 运行基础测试');
  console.log('  debugSearch("项目") - 调试搜索');
  console.log('  tokenize("测试文本") - 测试分词');
  console.log('  createTestTasks() - 创建测试数据');
  
  // 自动运行基础测试
  setTimeout(() => {
    console.log('🚀 自动运行搜索测试...');
    testBasicSearch();
  }, 1000);
}