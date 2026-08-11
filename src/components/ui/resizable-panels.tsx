import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ResizablePanelsProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftWidth?: number; // 百分比，默认60%
  minLeftWidth?: number; // 最小宽度百分比，默认30%
  minRightWidth?: number; // 最小宽度百分比，默认25%
  className?: string;
  resizerClassName?: string;
}

const ResizablePanels: React.FC<ResizablePanelsProps> = ({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 60,
  minLeftWidth = 30,
  minRightWidth = 25,
  className,
  resizerClassName
}) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const container = containerRef.current;
    if (!container) return;

    const startX = e.clientX;
    const startLeftWidth = leftWidth;
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaPercentage = (deltaX / containerWidth) * 100;
      const newLeftWidth = startLeftWidth + deltaPercentage;

      const clampedLeftWidth = Math.max(
        minLeftWidth,
        Math.min(100 - minRightWidth, newLeftWidth)
      );

      setLeftWidth(clampedLeftWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [leftWidth, minLeftWidth, minRightWidth]);

  const rightWidth = 100 - leftWidth;

  return (
    <div
      ref={containerRef}
      className={cn('flex h-full min-h-0 w-full overflow-hidden', className)}
    >
      <div
        style={{ width: `${leftWidth}%` }}
        className="flex h-full min-h-0 flex-shrink-0 overflow-hidden"
      >
        {leftPanel}
      </div>

      <div
        className={cn(
          'flex-shrink-0 w-1 bg-border cursor-col-resize hover:bg-gray-400 transition-colors relative group',
          isDragging && 'bg-gray-400',
          resizerClassName
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 -inset-x-2 z-10" />
        <div className="absolute inset-y-0 left-0 w-full opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="h-full w-full bg-blue-500/20" />
        </div>
      </div>

      <div
        style={{ width: `${rightWidth}%` }}
        className="flex h-full min-h-0 flex-shrink-0 overflow-hidden"
      >
        {rightPanel}
      </div>
    </div>
  );
};

export default ResizablePanels; 