import { useState, useCallback } from "react";
import { TaskOperationType } from "@/contexts/task/types";

export interface TaskOperationProgress {
  isActive: boolean;
  operationType: TaskOperationType;
  progress: number;
}

export const useTaskOperation = () => {
  const [operationState, setOperationState] = useState<TaskOperationProgress>({
    isActive: false,
    operationType: "update",
    progress: 0,
  });

  // 开始操作：统一为“加载中 + 置灰”，不做进度动画与延迟
  const startOperation = useCallback(async (
    operationType: TaskOperationType,
    operationFn: () => Promise<void>,
    _options?: unknown
  ) => {
    setOperationState({ isActive: true, operationType, progress: 0 });
    try {
      await operationFn();
    } finally {
      setOperationState({ isActive: false, operationType: "update", progress: 0 });
    }
  }, []);

  // 取消操作
  const cancelOperation = useCallback(() => {
    setOperationState({
      isActive: false,
      operationType: "update",
      progress: 0,
    });
  }, []);

  return {
    operationState,
    startOperation,
    cancelOperation,
  };
};