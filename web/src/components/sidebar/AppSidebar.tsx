
import React, { useState, useMemo, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon-park";
// Keep lucide-react as fallback
import { Check, Clock, Search, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTaskContext } from "@/contexts/task";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import UserMenu from "@/components/UserMenu";
import { useAuth } from "@/contexts/AuthContext";
import { Task } from "@/types/task";
import { Skeleton } from "@/components/ui/skeleton";

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { tasks } = useTaskContext();

  // 简化搜索实现
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  // 防抖逻辑
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedQuery("");
      setSearchLoading(false);
      return;
    }
    
    setSearchLoading(true);
    
    const timeout = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setSearchLoading(false);
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // 简单搜索逻辑
  const searchMatches = useMemo(() => {
    if (!debouncedQuery.trim()) {
      console.log('🔍 Empty query, returning no results');
      return [];
    }
    
    console.log('🔍 Searching for:', debouncedQuery);
    console.log('📋 Tasks available:', tasks.length);
    
    const query = debouncedQuery.toLowerCase();
    const results = tasks.filter(task => {
      if (task.deleted || task.abandoned) return false;
      
      const titleMatch = task.title.toLowerCase().includes(query);
      const descMatch = task.description?.toLowerCase().includes(query) || false;
      const projectMatch = task.project?.toLowerCase().includes(query) || false;
      
      return titleMatch || descMatch || projectMatch;
    }).slice(0, 8);
    
    console.log('✅ Search results count:', results.length);
    
    return results.map(task => ({
      task,
      score: 10,
      matchedFields: ['title'],
      highlights: {
        title: task.title,
        description: task.description
      }
    }));
  }, [tasks, debouncedQuery]);

  // 处理搜索结果选择
  const handleTaskSelect = (task: Task) => {
    setSearchOpen(false);
    setSearchQuery("");
    navigate(`/search?query=${encodeURIComponent(searchQuery)}&taskId=${task.id}`);
  };

  // 处理查看所有结果
  const handleViewAllResults = () => {
    setSearchOpen(false);
    navigate(`/search?query=${encodeURIComponent(searchQuery)}`);
  };

  // 刷新页面（兼容 Web 与 Tauri WebView）
  const handleReload = () => {
    try {
      if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
        window.location.reload();
      }
    } catch (e) {
      console.error('Reload failed:', e);
    }
  };

  // 快捷键监听
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 检查是否按下 Cmd+K (Mac) 或 Ctrl+K (Windows/Linux)
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault(); // 阻止浏览器默认行为
        setSearchOpen(true);
      }
      
      // ESC 键关闭搜索
      if (event.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };

    // 添加全局键盘事件监听
    document.addEventListener('keydown', handleKeyDown);

    // 清理函数
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchOpen]); // 依赖 searchOpen 状态

  // 路由切换到 /search 时，强制关闭搜索对话框，避免遮罩残留阻塞点击
  useEffect(() => {
    if (searchOpen && location.pathname.startsWith('/search')) {
      setSearchOpen(false);
      setSearchQuery('');
    }
  }, [location.pathname, searchOpen]);

  return (
    <>
      <div
        className={cn(
          "flex flex-col h-screen border-r transition-all duration-300",
          collapsed ? "w-16" : "w-16 md:w-[72px]"
        )}
      >
        <div className="flex flex-col items-center gap-4 p-3 flex-1">
          <UserMenu />

          <div className="flex flex-col gap-2 mt-8 items-center w-full">
            <Link to="/" className="w-full">
              <Button
                variant={location.pathname === "/" ? "secondary" : "ghost"}
                size="icon"
                className={cn(
                  "w-full h-10 rounded-lg relative",
                  location.pathname === "/" && "bg-brand-orange bg-opacity-10 text-brand-orange hover:bg-brand-orange hover:bg-opacity-20"
                )}
              >
                <Icon icon="plan" size="20" className="h-5 w-5" />
              </Button>
            </Link>

            <Link to="/pomodoro" className="w-full">
              <Button
                variant={location.pathname === "/pomodoro" ? "secondary" : "ghost"}
                size="icon"
                className={cn(
                  "w-full h-10 rounded-lg",
                  location.pathname === "/pomodoro" && "bg-brand-orange bg-opacity-10 text-brand-orange hover:bg-brand-orange hover:bg-opacity-20"
                )}
              >
                <Icon icon="tomato" size="20" className="h-5 w-5" />
              </Button>
            </Link>

            <Link to="/chat" className="w-full">
              <Button
                variant={location.pathname === "/chat" ? "secondary" : "ghost"}
                size="icon"
                className={cn(
                  "w-full h-10 rounded-lg",
                  location.pathname === "/chat" && "bg-brand-orange bg-opacity-10 text-brand-orange hover:bg-brand-orange hover:bg-opacity-20"
                )}
              >
                <Icon icon="message" size="20" className="h-5 w-5" />
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="w-full h-10 rounded-lg"
              onClick={() => setSearchOpen(true)}
              title="搜索 (Cmd+K)"
            >
              <Icon icon="search" size="20" className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-auto mb-4 flex justify-center w-full">
            <div className="w-full flex flex-col items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-10 rounded-lg"
                onClick={handleReload}
                title="刷新页面"
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
              <Link to="/settings" className="w-full">
                <Button
                  variant={location.pathname === "/settings" ? "secondary" : "ghost"}
                  size="icon"
                  className={cn(
                    "w-full h-10 rounded-lg",
                    location.pathname === "/settings" && "bg-brand-orange bg-opacity-10 text-brand-orange hover:bg-brand-orange hover:bg-opacity-20"
                  )}
                >
                  <Icon icon="setting" size="20" className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={searchOpen && !location.pathname.startsWith('/search')} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-2xl p-0">
          <div className="flex flex-col max-h-[70vh]">
            {/* 搜索输入框 */}
            <div className="flex items-center border-b px-4 py-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                placeholder="搜索任务... (Cmd+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                autoFocus
              />
            </div>
            
            {/* 搜索结果 */}
            <div className="flex-1 overflow-hidden">
              {searchLoading ? (
                <div className="px-2 py-3 space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <Skeleton className="h-5 w-5" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-2">
                    <Skeleton className="h-5 w-5" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-2">
                    <Skeleton className="h-5 w-5" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>
              ) : !searchQuery.trim() ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Icon icon="search" size="48" className="mx-auto mb-4 opacity-50" />
                  <p className="text-base font-medium mb-2">搜索任务</p>
                  <p className="text-xs">输入关键词搜索任务标题、描述和项目</p>
                </div>
              ) : searchMatches.length === 0 ? (
                <div className="py-8 text-center">
                  <Icon icon="search" size="48" className="mx-auto mb-4 opacity-50" />
                  <p className="text-base font-medium mb-2">没有找到相关任务</p>
                  <p className="text-sm text-muted-foreground">
                    尝试使用不同的关键词
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="p-2">
                    <div className="mb-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                      找到 {searchMatches.length} 个结果
                    </div>
                    <div className="space-y-1">
                      {searchMatches.map((match) => {
                        const { task } = match;
                        return (
                          <div
                            key={task.id}
                            onClick={() => handleTaskSelect(task)}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate mb-2">
                                {task.title}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {task.date && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(task.date).toLocaleDateString('zh-CN')}
                                  </span>
                                )}
                                {task.project && (
                                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                                    {task.project}
                                  </span>
                                )}
                                {task.completed && (
                                  <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    已完成
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* 查看所有结果按钮 */}
                    <div className="mt-4 p-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleViewAllResults}
                      >
                        查看所有搜索结果
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AppSidebar;
