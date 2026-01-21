import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const messages = [
  "蜗牛虽慢，但从不放弃...",
  "正在整理你的小任务...",
  "慢慢来，比较快...",
  "给蜗牛一点时间...",
  "加载中，顺便看看窗外..."
];

interface LoadingProps {
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({ className }) => {
  const [currentMessage, setCurrentMessage] = useState(messages[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentIndex = messages.indexOf(currentMessage);
      const nextIndex = (currentIndex + 1) % messages.length;
      setCurrentMessage(messages[nextIndex]);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentMessage]);

  return (
    <div className={cn("flex flex-col items-center justify-center h-full", className)}>
      <div className="animate-pulse flex space-x-4">
        <div className="flex-1 space-y-4 py-1">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm text-gray-500">{currentMessage}</p>
    </div>
  );
};