import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/task';

export interface SearchOptions {
  includeCompleted?: boolean;
  includeDeleted?: boolean;
  includeAbandoned?: boolean;
  limit?: number;
  projectFilter?: string;
}

export interface SearchResult {
  tasks: Task[];
  totalCount: number;
  searchTime: number;
}

/**
 * Supabase 全文搜索实现
 * 使用 PostgreSQL 的 full-text search 功能
 */
export async function searchTasksInDatabase(
  query: string, 
  options: SearchOptions = {}
): Promise<SearchResult> {
  const startTime = performance.now();
  
  const {
    includeCompleted = true,
    includeDeleted = false,
    includeAbandoned = false,
    limit = 50,
    projectFilter
  } = options;

  if (!query.trim()) {
    return { tasks: [], totalCount: 0, searchTime: 0 };
  }

  try {
    // 构建基础查询
    let supabaseQuery = supabase
      .from('tasks')
      .select('*', { count: 'exact' });

    // 过滤条件
    if (!includeDeleted) {
      supabaseQuery = supabaseQuery.or('deleted.is.null,deleted.eq.false');
    }
    
    if (!includeAbandoned) {
      supabaseQuery = supabaseQuery.or('abandoned.is.null,abandoned.eq.false');
    }
    
    if (!includeCompleted) {
      supabaseQuery = supabaseQuery.eq('completed', false);
    }

    if (projectFilter) {
      supabaseQuery = supabaseQuery.eq('project', projectFilter);
    }

    // 全文搜索
    // 方案1: 使用 textSearch (如果有 GIN 索引)
    const searchQuery = query.trim().split(/\s+/).join(' | ');
    supabaseQuery = supabaseQuery.textSearch('title', searchQuery);

    // 方案2: 如果没有全文搜索索引，使用 ILIKE
    // supabaseQuery = supabaseQuery.or(
    //   `title.ilike.%${query}%,description.ilike.%${query}%,project.ilike.%${query}%`
    // );

    // 排序和限制
    supabaseQuery = supabaseQuery
      .order('completed', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error, count } = await supabaseQuery;

    if (error) {
      console.error('Supabase search error:', error);
      throw error;
    }

    const endTime = performance.now();
    const searchTime = endTime - startTime;

    return {
      tasks: (data || []) as Task[],
      totalCount: count || 0,
      searchTime
    };

  } catch (error) {
    console.error('Database search failed:', error);
    
    // 回退到客户端搜索
    return searchTasksFallback(query, options);
  }
}

/**
 * 使用 ILIKE 的模糊搜索实现
 * 适用于没有全文搜索索引的情况
 */
export async function searchTasksWithILike(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult> {
  const startTime = performance.now();
  
  const {
    includeCompleted = true,
    includeDeleted = false,
    includeAbandoned = false,
    limit = 50,
    projectFilter
  } = options;

  if (!query.trim()) {
    return { tasks: [], totalCount: 0, searchTime: 0 };
  }

  try {
    let supabaseQuery = supabase
      .from('tasks')
      .select('*', { count: 'exact' });

    // 过滤条件
    if (!includeDeleted) {
      supabaseQuery = supabaseQuery.or('deleted.is.null,deleted.eq.false');
    }
    
    if (!includeAbandoned) {
      supabaseQuery = supabaseQuery.or('abandoned.is.null,abandoned.eq.false');
    }
    
    if (!includeCompleted) {
      supabaseQuery = supabaseQuery.eq('completed', false);
    }

    if (projectFilter) {
      supabaseQuery = supabaseQuery.eq('project', projectFilter);
    }

    // 使用 ILIKE 进行模糊搜索
    const searchPattern = `%${query}%`;
    supabaseQuery = supabaseQuery.or(
      `title.ilike.${searchPattern},description.ilike.${searchPattern},project.ilike.${searchPattern}`
    );

    // 排序：优先显示标题匹配的结果
    supabaseQuery = supabaseQuery
      .order('completed', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error, count } = await supabaseQuery;

    if (error) {
      console.error('Supabase ILIKE search error:', error);
      throw error;
    }

    const endTime = performance.now();
    const searchTime = endTime - startTime;

    return {
      tasks: (data || []) as Task[],
      totalCount: count || 0,
      searchTime
    };

  } catch (error) {
    console.error('ILIKE search failed:', error);
    return searchTasksFallback(query, options);
  }
}

/**
 * 回退搜索方案 - 获取所有任务后在前端搜索
 */
async function searchTasksFallback(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult> {
  
  const startTime = performance.now();
  
  try {
    // 获取所有任务
    let supabaseQuery = supabase.from('tasks').select('*');
    
    if (!options.includeDeleted) {
      supabaseQuery = supabaseQuery.or('deleted.is.null,deleted.eq.false');
    }
    
    if (!options.includeAbandoned) {
      supabaseQuery = supabaseQuery.or('abandoned.is.null,abandoned.eq.false');
    }

    const { data: allTasks, error } = await supabaseQuery;

    if (error) {
      throw error;
    }

    // 在前端进行搜索
    const { searchTasks } = await import('@/utils/searchUtils');
    const results = searchTasks(allTasks || [], query, {
      minScore: 0.5,
      maxResults: options.limit || 50
    });

    const endTime = performance.now();
    const searchTime = endTime - startTime;

    return {
      tasks: results.map(r => r.task),
      totalCount: results.length,
      searchTime
    };

  } catch (error) {
    console.error('Fallback search failed:', error);
    return { tasks: [], totalCount: 0, searchTime: 0 };
  }
}

/**
 * 创建全文搜索索引的 SQL 语句
 * 需要在 Supabase SQL 编辑器中执行
 */
export const CREATE_SEARCH_INDEX_SQL = `
-- 创建全文搜索索引
CREATE INDEX IF NOT EXISTS tasks_search_idx 
ON tasks 
USING gin(to_tsvector('simple', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(project, '')));

-- 创建搜索函数
CREATE OR REPLACE FUNCTION search_tasks(search_query text)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  project text,
  completed boolean,
  created_at timestamptz,
  rank real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.description,
    t.project,
    t.completed,
    t.created_at,
    ts_rank(to_tsvector('simple', t.title || ' ' || COALESCE(t.description, '') || ' ' || COALESCE(t.project, '')), 
             to_tsquery('simple', search_query)) as rank
  FROM tasks t
  WHERE 
    to_tsvector('simple', t.title || ' ' || COALESCE(t.description, '') || ' ' || COALESCE(t.project, ''))
    @@ to_tsquery('simple', search_query)
    AND (t.deleted IS NULL OR t.deleted = false)
    AND (t.abandoned IS NULL OR t.abandoned = false)
  ORDER BY rank DESC, t.created_at DESC;
END;
$$ LANGUAGE plpgsql;
`;

/**
 * 使用自定义搜索函数
 */
export async function searchTasksWithFunction(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult> {
  const startTime = performance.now();
  
  try {
    // 处理搜索查询，转换为 PostgreSQL tsquery 格式
    const searchQuery = query.trim().split(/\s+/).join(' & ');
    
    const { data, error } = await supabase
      .rpc('search_tasks', { search_query: searchQuery })
      .limit(options.limit || 50);

    if (error) {
      console.error('Function search error:', error);
      throw error;
    }

    const endTime = performance.now();
    const searchTime = endTime - startTime;

    return {
      tasks: (data || []) as Task[],
      totalCount: data?.length || 0,
      searchTime
    };

  } catch (error) {
    console.error('Function search failed:', error);
    return searchTasksFallback(query, options);
  }
}