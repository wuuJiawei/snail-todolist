import { useState, useMemo, useCallback, useEffect } from 'react';
import { Task } from '@/types/task';
import { searchTasks, getSearchSuggestions, SearchMatch, debounce } from '@/utils/searchUtils';

export interface SearchState {
  query: string;
  results: SearchMatch[];
  suggestions: string[];
  loading: boolean;
  searchTime: number;
  lastSearch: string;
}

export interface SearchOptions {
  minScore?: number;
  maxResults?: number;
  includeFuzzy?: boolean;
  debounceMs?: number;
  enableSuggestions?: boolean;
}

export function useAdvancedSearch(
  tasks: Task[], 
  options: SearchOptions = {}
) {
  const {
    minScore = 1,
    maxResults = 50,
    includeFuzzy = true,
    debounceMs = 300,
    enableSuggestions = true
  } = options;

  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    results: [],
    suggestions: [],
    loading: false,
    searchTime: 0,
    lastSearch: ''
  });

  // 执行搜索的核心函数
  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchState(prev => ({
        ...prev,
        results: [],
        suggestions: [],
        loading: false,
        searchTime: 0,
        lastSearch: ''
      }));
      return;
    }

    const startTime = performance.now();
    
    // 执行搜索
    const results = searchTasks(tasks, query, {
      minScore,
      maxResults,
      includeFuzzy
    });

    // 获取搜索建议
    const suggestions = enableSuggestions 
      ? getSearchSuggestions(tasks, query, 5)
      : [];

    const endTime = performance.now();
    const searchTime = endTime - startTime;

    setSearchState(prev => ({
      ...prev,
      results,
      suggestions,
      loading: false,
      searchTime,
      lastSearch: query
    }));

    // 性能监控日志
    if (process.env.NODE_ENV === 'development') {
      console.log(`Search Performance:`, {
        query,
        resultsCount: results.length,
        searchTime: `${searchTime.toFixed(2)}ms`,
        tasksScanned: tasks.length
      });
    }
  }, [tasks, minScore, maxResults, includeFuzzy, enableSuggestions]);

  // 防抖搜索函数
  const debouncedSearch = useMemo(
    () => debounce(performSearch, debounceMs),
    [performSearch, debounceMs]
  );

  // 搜索函数
  const search = useCallback((query: string) => {
    setSearchState(prev => ({
      ...prev,
      query,
      loading: query.trim() ? true : false
    }));

    if (query.trim()) {
      debouncedSearch(query);
    } else {
      performSearch(query);
    }
  }, [debouncedSearch, performSearch]);

  // 立即搜索（不防抖）
  const searchImmediate = useCallback((query: string) => {
    setSearchState(prev => ({
      ...prev,
      query,
      loading: query.trim() ? true : false
    }));
    
    performSearch(query);
  }, [performSearch]);

  // 清空搜索
  const clearSearch = useCallback(() => {
    setSearchState({
      query: '',
      results: [],
      suggestions: [],
      loading: false,
      searchTime: 0,
      lastSearch: ''
    });
  }, []);

  // 获取搜索统计信息
  const getSearchStats = useCallback(() => {
    const { results, searchTime, lastSearch } = searchState;
    
    if (!lastSearch) return null;

    const completedCount = results.filter(match => match.task.completed).length;
    const incompleteCount = results.length - completedCount;
    
    return {
      totalResults: results.length,
      completedTasks: completedCount,
      incompleteTasks: incompleteCount,
      searchTime: searchTime,
      averageScore: results.length > 0 
        ? results.reduce((sum, match) => sum + match.score, 0) / results.length 
        : 0,
      topScore: results.length > 0 ? results[0].score : 0
    };
  }, [searchState]);

  // 获取按分数分组的结果
  const getResultsByScore = useCallback(() => {
    const { results } = searchState;
    
    return {
      excellent: results.filter(match => match.score >= 15),
      good: results.filter(match => match.score >= 8 && match.score < 15),
      fair: results.filter(match => match.score >= 3 && match.score < 8),
      poor: results.filter(match => match.score < 3)
    };
  }, [searchState]);

  // 获取按匹配字段分组的结果
  const getResultsByField = useCallback(() => {
    const { results } = searchState;
    
    return {
      titleMatches: results.filter(match => match.matchedFields.includes('title')),
      descriptionMatches: results.filter(match => match.matchedFields.includes('description')),
      projectMatches: results.filter(match => match.matchedFields.includes('project'))
    };
  }, [searchState]);

  return {
    // 状态
    query: searchState.query,
    results: searchState.results,
    suggestions: searchState.suggestions,
    loading: searchState.loading,
    searchTime: searchState.searchTime,
    
    // 操作函数
    search,
    searchImmediate,
    clearSearch,
    
    // 统计和分析
    getSearchStats,
    getResultsByScore,
    getResultsByField,
    
    // 便捷访问器
    hasResults: searchState.results.length > 0,
    isEmpty: !searchState.query.trim(),
    isSearching: searchState.loading
  };
}