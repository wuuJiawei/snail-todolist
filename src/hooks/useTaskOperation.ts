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

  // 开始操作动画 - 分离API调用和状态更新
  const startOperation = useCallback(async (
    operationType: TaskOperationType,
    operationFn: () => Promise<void>,
    options?: {
      initialProgress?: number;
      progressDuration?: number;
      completionDelay?: number;
    }
  ) => {
    const { 
      initialProgress = 0, 
      progressDuration = 1500, 
      completionDelay = 800 
    } = options || {};
    
    // 开始操作
    setOperationState({
      isActive: true,
      operationType,
      progress: initialProgress,
    });

    return new Promise<void>((resolve, reject) => {
      let apiResult: { success: boolean; error?: Error } | null = null;
      let progressInterval: NodeJS.Timeout | null = null;
      
      // 立即开始API调用，但不立即应用结果
      operationFn().then(() => {
        apiResult = { success: true };
      }).catch((error) => {
        apiResult = { success: false, error };
      });
      
      // 同时开始进度条动画
      const totalSteps = 30;
      const stepDuration = progressDuration / totalSteps;
      let currentStep = 0;
      
      progressInterval = setInterval(() => {
        currentStep++;
        let newProgress = (currentStep / totalSteps) * 100;
        
        // 如果API已完成，确保进度条能到100%
        if (apiResult && newProgress < 100) {
          newProgress = 100;
        }
        
        setOperationState(prev => ({
          ...prev,
          progress: Math.min(newProgress, 100),
        }));
        
        // 进度条到达100%后，延迟一段时间再应用API结果
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          
          setTimeout(() => {
            // 隐藏进度条
            setOperationState({
              isActive: false,
              operationType: "update",
              progress: 0,
            });
            
            // 应用API结果
            if (apiResult) {
              if (apiResult.success) {
                resolve();
              } else {
                reject(apiResult.error);
              }
            } else {
              // API还没完成，等待它完成
              const waitForApi = setInterval(() => {
                if (apiResult) {
                  clearInterval(waitForApi);
                  if (apiResult.success) {
                    resolve();
                  } else {
                    reject(apiResult.error);
                  }
                }
              }, 50);
            }
          }, completionDelay);
        }
      }, stepDuration);
    });
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