import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon-park';
import { Clock, Target, TrendingUp, Zap } from 'lucide-react';

interface SearchStatsProps {
  stats: {
    totalResults: number;
    completedTasks: number;
    incompleteTasks: number;
    searchTime: number;
    averageScore: number;
    topScore: number;
  } | null;
  query: string;
}

export const SearchStats: React.FC<SearchStatsProps> = ({ stats, query }) => {
  if (!stats || !query) return null;

  const formatTime = (time: number) => {
    if (time < 1) return '<1ms';
    if (time < 1000) return `${time.toFixed(1)}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  };

  const getPerformanceColor = (time: number) => {
    if (time < 10) return 'text-green-600 dark:text-green-400';
    if (time < 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreColor = (score: number) => {
    if (score >= 15) return 'text-green-600 dark:text-green-400';
    if (score >= 8) return 'text-blue-600 dark:text-blue-400';
    if (score >= 3) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* 搜索性能 */}
          <div className="flex items-center gap-2">
            <Zap className={`h-4 w-4 ${getPerformanceColor(stats.searchTime)}`} />
            <span className="text-sm font-medium">搜索耗时</span>
            <Badge variant="outline" className={getPerformanceColor(stats.searchTime)}>
              {formatTime(stats.searchTime)}
            </Badge>
          </div>

          {/* 结果数量 */}
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium">找到结果</span>
            <Badge variant="secondary">
              {stats.totalResults} 个任务
            </Badge>
          </div>

          {/* 完成状态分布 */}
          {stats.totalResults > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Icon icon="plan" size="16" className="text-orange-600 dark:text-orange-400" />
                <span className="text-sm">待办</span>
                <Badge variant="outline" className="text-orange-600 dark:text-orange-400">
                  {stats.incompleteTasks}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Icon icon="check" size="16" className="text-green-600 dark:text-green-400" />
                <span className="text-sm">已完成</span>
                <Badge variant="outline" className="text-green-600 dark:text-green-400">
                  {stats.completedTasks}
                </Badge>
              </div>
            </div>
          )}

          {/* 匹配质量 */}
          {stats.totalResults > 0 && (
            <div className="flex items-center gap-2">
              <TrendingUp className={`h-4 w-4 ${getScoreColor(stats.averageScore)}`} />
              <span className="text-sm font-medium">平均分数</span>
              <Badge variant="outline" className={getScoreColor(stats.averageScore)}>
                {stats.averageScore.toFixed(1)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                (最高: {stats.topScore})
              </span>
            </div>
          )}
        </div>

        {/* 性能提示 */}
        {stats.searchTime > 100 && (
          <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                搜索耗时较长，考虑缩短搜索词或减少任务数量
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};