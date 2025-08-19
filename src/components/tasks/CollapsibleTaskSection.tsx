import React, { useState, useRef, useCallback, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Task } from "@/types/task";

interface CollapsibleTaskSectionProps {
  title: string;
  tasks: Task[];
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  variant?: "completed" | "abandoned";
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  displayedCount?: number; // 当前显示的任务数量
}

const CollapsibleTaskSection: React.FC<CollapsibleTaskSectionProps> = ({
  title,
  tasks,
  children,
  className,
  icon,
  variant = "completed",
  onLoadMore,
  hasMore = false,
  isLoading = false,
  displayedCount
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 滚动到底部时触发加载更多
  const handleScroll = useCallback(() => {
    if (!scrollAreaRef.current || !hasMore || isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') || {};
    
    if (scrollTop && scrollHeight && clientHeight) {
      // 当距离底部还有50px时就开始加载
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        onLoadMore?.();
      }
    }
  }, [hasMore, isLoading, onLoadMore]);

  // 监听滚动事件
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.addEventListener('scroll', handleScroll);
      return () => viewport.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // 根据变体设置样式
  const variantStyles = {
    completed: {
      bg: "bg-green-50/50 dark:bg-green-950/20",
      border: "border-green-200/50 dark:border-green-800/30",
      hover: "hover:bg-green-100/50 dark:hover:bg-green-900/30",
      text: "text-green-700 dark:text-green-300"
    },
    abandoned: {
      bg: "bg-orange-50/50 dark:bg-orange-950/20", 
      border: "border-orange-200/50 dark:border-orange-800/30",
      hover: "hover:bg-orange-100/50 dark:hover:bg-orange-900/30",
      text: "text-orange-700 dark:text-orange-300"
    }
  };

  const currentStyle = variantStyles[variant];

  return (
    <div className={cn(
      "border-t transition-all duration-200 backdrop-blur-sm",
      currentStyle.border,
      isExpanded ? currentStyle.bg : "bg-background/80",
      className
    )}>
      {/* 可点击的标题栏 */}
      <Button
        variant="ghost"
        onClick={toggleExpanded}
        className={cn(
          "w-full justify-between px-4 py-3 h-auto font-medium transition-colors",
          currentStyle.hover,
          isExpanded ? currentStyle.text : "text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm">{title}</span>
          {tasks.length > 0 && (
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs",
                isExpanded ? "bg-background/60" : "bg-muted/60"
              )}
            >
              {tasks.length}
            </Badge>
          )}
        </div>
        
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
      </Button>

      {/* 可折叠内容区域 */}
      {isExpanded && (
        <div className="border-t border-border/30">
          <ScrollArea 
            ref={scrollAreaRef}
            className="h-64 px-2 py-2"
            type="auto"
          >
            <div className="space-y-1">
              {children}
              
              {/* 加载更多按钮 */}
              {hasMore && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onLoadMore}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-2" />
                        加载中...
                      </>
                    ) : (
                      <>
                        <span>加载更多</span>
                        {displayedCount && (
                          <span className="text-xs text-muted-foreground ml-1">({tasks.length - displayedCount})</span>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {/* 空状态 */}
              {tasks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">暂无{variant === 'completed' ? '已完成' : '已放弃'}任务</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default CollapsibleTaskSection;