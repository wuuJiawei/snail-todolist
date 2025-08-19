
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Clock, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { startPomodoroSession, completePomodoroSession } from "@/services/pomodoroService";

const Pomodoro = () => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Get the duration based on mode
  const getDuration = useCallback(() => {
    return mode === 'focus' ? 25 : 5;
  }, [mode]);

  // Start a new pomodoro session
  const startSession = useCallback(async () => {
    if (!isActive) {
      const duration = getDuration();
      const id = await startPomodoroSession(mode, duration);
      if (id) {
        setSessionId(id);
        console.log(`Started ${mode} session with ID: ${id}, duration: ${duration} minutes`);
      } else {
        toast({
          title: "启动失败",
          description: "无法启动番茄钟会话，请检查网络连接",
          variant: "destructive",
        });
      }
    }
  }, [isActive, mode, getDuration]);

  // Complete a pomodoro session
  const completeSession = useCallback(async () => {
    if (sessionId) {
      const success = await completePomodoroSession(sessionId);
      if (success) {
        console.log(`Completed ${mode} session with ID: ${sessionId}`);
        toast({
          title: "番茄钟完成",
          description: mode === 'focus' ? "专注时间已完成！" : "休息时间已完成！",
        });
      }
      setSessionId(null);
    }
  }, [sessionId, mode]);

  useEffect(() => {
    let interval: number | undefined;

    if (isActive) {
      interval = window.setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            // Timer completed
            clearInterval(interval);
            setIsActive(false);
            completeSession();
            
            // Switch modes between focus and break
            if (mode === 'focus') {
              setMode('break');
              setMinutes(5);
            } else {
              setMode('focus');
              setMinutes(25);
            }
            return;
          }
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, minutes, seconds, mode, completeSession]);

  const toggleTimer = async () => {
    if (!isActive) {
      await startSession();
    }
    setIsActive(!isActive);
  };

  const resetTimer = async () => {
    setIsActive(false);
    
    // If there's an active session, mark it as incomplete but ended
    if (sessionId) {
      console.log(`Resetting timer, ending session ID: ${sessionId}`);
      await completePomodoroSession(sessionId);
      setSessionId(null);
    }
    
    if (mode === 'focus') {
      setMinutes(25);
    } else {
      setMinutes(5);
    }
    setSeconds(0);
  };

  const switchMode = async () => {
    setIsActive(false);
    
    // If there's an active session, end it before switching
    if (sessionId) {
      console.log(`Switching mode, ending session ID: ${sessionId}`);
      await completePomodoroSession(sessionId);
      setSessionId(null);
    }
    
    if (mode === 'focus') {
      setMode('break');
      setMinutes(5);
    } else {
      setMode('focus');
      setMinutes(25);
    }
    setSeconds(0);
  };

  return (
    <div className="bg-gray-50 h-full w-full flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-6">
          {mode === 'focus' ? '专注时间' : '休息时间'}
        </h1>
        
        <div className="flex justify-center mb-10">
          <div className="text-7xl font-bold">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>
        
        <div className="flex justify-center gap-6 mb-8">
          <Button 
            size="lg" 
            onClick={toggleTimer}
            className="w-24 h-24 rounded-full hover:scale-105 transition-transform"
          >
            {isActive ? 
              <Pause className="h-10 w-10" /> : 
              <Play className="h-10 w-10 ml-1" />
            }
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            onClick={resetTimer}
            className="w-24 h-24 rounded-full hover:scale-105 transition-transform"
          >
            <RotateCcw className="h-8 w-8" />
          </Button>
        </div>
        
        <div className="flex gap-2 justify-center">
          <Button 
            variant={mode === 'focus' ? "default" : "outline"} 
            onClick={() => { if (mode !== 'focus') switchMode(); }}
            className="flex-1"
          >
            专注
          </Button>
          <Button 
            variant={mode === 'break' ? "default" : "outline"} 
            onClick={() => { if (mode !== 'break') switchMode(); }}
            className="flex-1"
          >
            休息
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pomodoro;
