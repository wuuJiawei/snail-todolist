import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTaskContext } from "@/contexts/task";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon-park";
import { Check, Clock, ArrowLeft, Loader2 } from "lucide-react";
import { Task } from "@/types/task";
import { cn } from "@/lib/utils";
import { highlightText } from "@/utils/searchUtils";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import TaskDetail from "@/components/tasks/TaskDetail";
import { Input } from "@/components/ui/input";

// 高亮搜索关键词的组件
const HighlightText: React.FC<{ html: string }> = ({ html }) => {
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

const TaskCard: React.FC<{
  task: Task;
  query: string;
  active?: boolean;
  onClick: () => void;
}> = ({ task, query, active = false, onClick }) => {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-brand-orange/50",
        active && "ring-2 ring-brand-orange/50 border-brand-orange/60"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {task.icon && (
            <span className="text-lg flex-shrink-0 mt-0.5">{task.icon}</span>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base mb-2 leading-tight">
              <HighlightText html={highlightText(task.title, query)} />
            </h3>
            {task.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                <HighlightText html={highlightText(task.description, query)} />
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {task.completed && (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                >
                  <Check className="w-3 h-3 mr-1" />
                  已完成
                </Badge>
              )}
              {task.date && (
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(task.date).toLocaleDateString("zh-CN")}
                </Badge>
              )}
              {task.project && <Badge variant="outline">{task.project}</Badge>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const SearchResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tasks, selectTask, selectedTask } = useTaskContext();
  
  const query = searchParams.get('query') || '';
  const highlightTaskId = searchParams.get('taskId');
  const [loading, setLoading] = useState(false);
  const [localQuery, setLocalQuery] = useState(query);
  
  // 简单搜索逻辑，与AppSidebar保持一致
  const searchResults = useMemo(() => {
    if (!localQuery.trim()) return [];
    
    console.log('🔍 SearchResults: Searching for:', localQuery);
    console.log('📋 SearchResults: Tasks available:', tasks.length);
    
    const queryLower = localQuery.toLowerCase();
    const results = tasks.filter(task => {
      if (task.deleted || task.abandoned) return false;
      
      const titleMatch = task.title.toLowerCase().includes(queryLower);
      const descMatch = task.description?.toLowerCase().includes(queryLower) || false;
      const projectMatch = task.project?.toLowerCase().includes(queryLower) || false;
      
      return titleMatch || descMatch || projectMatch;
    });
    
    console.log('✅ SearchResults: Search results count:', results.length);
    
    return results;
  }, [tasks, localQuery]);

  // 同步 URL -> 本地输入框
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // 本地输入变化时，防抖更新 URL，并根据是否仍匹配决定是否保留选中任务
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const trimmed = localQuery.trim();
      const params = new URLSearchParams();
      if (trimmed) params.set('query', trimmed);

      const currentSelected = selectedTask;
      const matchesSelected = Boolean(
        currentSelected &&
        !currentSelected.deleted &&
        !currentSelected.abandoned &&
        (() => {
          const q = trimmed.toLowerCase();
          const titleMatch = currentSelected.title.toLowerCase().includes(q);
          const descMatch = currentSelected.description?.toLowerCase().includes(q) || false;
          const projectMatch = currentSelected.project?.toLowerCase().includes(q) || false;
          return q ? (titleMatch || descMatch || projectMatch) : false;
        })()
      );

      if (matchesSelected && currentSelected) {
        params.set('taskId', currentSelected.id);
      } else {
        // 清除不再匹配的选中态
        if (selectedTask) {
          selectTask(null);
        }
      }

      const nextUrl = `/search${params.toString() ? `?${params.toString()}` : ''}`;
      navigate(nextUrl, { replace: true });
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [localQuery, selectedTask, navigate, selectTask]);

  // 按完成状态分组
  const incompleteResults = searchResults.filter(task => !task.completed);
  const completedResults = searchResults.filter(task => task.completed);

  const handleTaskClick = (task: Task) => {
    selectTask(task.id);
    const next = `/search?query=${encodeURIComponent(localQuery)}&taskId=${task.id}`;
    navigate(next, { replace: true });
  };

  const handleBack = () => {
    navigate(-1);
  };

  useEffect(() => {
    if (highlightTaskId) {
      const exists = tasks.some((t) => t.id === highlightTaskId);
      if (exists) selectTask(highlightTaskId);
    }
  }, [highlightTaskId, tasks, selectTask]);

  const leftPanel = (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="container max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-3">搜索结果</h1>
            <div className="flex items-center gap-3">
              <Input
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                placeholder="在此搜索任务..."
                className="max-w-xl"
                autoFocus
              />
              <div className="text-sm text-muted-foreground">
                {loading ? (
                  <span>搜索中...</span>
                ) : localQuery ? (
                  searchResults.length > 0 ? (
                    <span>找到 {searchResults.length} 个任务</span>
                  ) : (
                    <span>未找到相关任务</span>
                  )
                ) : (
                  <span>输入关键词开始搜索</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 mx-auto mb-4 text-muted-foreground animate-spin" />
            <h3 className="text-lg font-medium mb-2">搜索中...</h3>
            <p className="text-muted-foreground">正在分析任务内容，请稍候</p>
          </div>
        ) : localQuery ? (
          searchResults.length > 0 ? (
            <div className="space-y-6">
              {incompleteResults.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Icon icon="plan" size="18" />
                    待办任务 ({incompleteResults.length})
                  </h2>
                  <div className="grid gap-3">
                    {incompleteResults.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        query={localQuery}
                        active={selectedTask?.id === task.id}
                        onClick={() => handleTaskClick(task)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {completedResults.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-600" />
                    已完成任务 ({completedResults.length})
                  </h2>
                  <div className="grid gap-3">
                    {completedResults.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        query={localQuery}
                        active={selectedTask?.id === task.id}
                        onClick={() => handleTaskClick(task)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Icon icon="search" size="48" className="mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">没有找到相关任务</h3>
              <p className="text-muted-foreground mb-6">尝试使用不同的关键词、检查拼写，或使用模糊搜索</p>
              <div className="text-sm text-muted-foreground mb-4">
                <p>搜索提示：</p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>支持中英文分词搜索</li>
                  <li>支持模糊匹配，允许拼写错误</li>
                  <li>搜索范围包括任务标题、描述和项目</li>
                </ul>
              </div>
              <Button onClick={handleBack} variant="outline">返回</Button>
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <Icon icon="search" size="48" className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">开始搜索</h3>
            <p className="text-muted-foreground mb-4">输入关键词来搜索你的任务</p>
            <div className="text-sm text-muted-foreground">
              <p>搜索功能：</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>智能分词：自动识别中英文词汇</li>
                <li>模糊匹配：容错拼写错误</li>
                <li>高级高亮：精确标记匹配词汇</li>
                <li>相关性排序：按匹配分数排列结果</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full w-full overflow-hidden">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={33} minSize={25} className="overflow-hidden">
          {leftPanel}
        </ResizablePanel>
        <ResizableHandle
          withHandle
          aria-label="调整搜索结果与任务详情宽度"
          title="拖动调整搜索结果与任务详情宽度"
        />
        <ResizablePanel defaultSize={67} minSize={30} className="overflow-hidden">
          <TaskDetail />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default SearchResults;
