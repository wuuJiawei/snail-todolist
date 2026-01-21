import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as storageOps from "@/storage/operations";
import type { PomodoroSessionPublic, PomodoroSessionType } from "@/storage/operations";
import { POMODORO_CYCLE_PROGRESS_KEY } from "@/constants/storage-keys";
import { PomodoroSettings } from "./usePomodoroSettings";

type TransitionReason = "complete" | "skip" | "reset";

interface NextStateResult {
  nextMode: PomodoroSessionType;
  nextFocusStreak: number;
}

const getDurationForMode = (mode: PomodoroSessionType, settings: PomodoroSettings): number => {
  switch (mode) {
    case "focus":
      return settings.focusDuration;
    case "long_break":
      return settings.longBreakDuration;
    default:
      return settings.shortBreakDuration;
  }
};

const loadFocusStreak = (maxCycles: number): number => {
  try {
    const raw = localStorage.getItem(POMODORO_CYCLE_PROGRESS_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { focusStreak?: number };
    if (typeof parsed.focusStreak === "number") {
      const maxValue = Math.max(0, maxCycles - 1);
      return Math.max(0, Math.min(parsed.focusStreak, maxValue));
    }
  } catch (error) {
    console.error("Failed to load pomodoro focus streak:", error);
  }
  return 0;
};

const persistFocusStreak = (value: number) => {
  try {
    localStorage.setItem(POMODORO_CYCLE_PROGRESS_KEY, JSON.stringify({ focusStreak: value }));
  } catch (error) {
    console.error("Failed to persist pomodoro focus streak:", error);
  }
};

const computeNextState = (
  currentMode: PomodoroSessionType,
  focusStreak: number,
  settings: PomodoroSettings,
  reason: TransitionReason
): NextStateResult => {
  if (reason === "reset") {
    return { nextMode: currentMode, nextFocusStreak: focusStreak };
  }

  if (currentMode === "focus") {
    if (reason === "complete") {
      const updatedStreak = focusStreak + 1;
      if (updatedStreak >= settings.cyclesBeforeLongBreak) {
        return { nextMode: "long_break", nextFocusStreak: 0 };
      }
      return { nextMode: "short_break", nextFocusStreak: updatedStreak };
    }
    // Skip focus -> move to short break but do not increment streak
    return { nextMode: "short_break", nextFocusStreak: focusStreak };
  }

  // Any break transitions back to focus
  return { nextMode: "focus", nextFocusStreak: focusStreak };
};

const playCompletionChime = () => {
  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 1.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1.3);
    oscillator.onended = () => {
      audioContext.close().catch((error) => {
        console.error("Failed to close pomodoro chime audio context:", error);
      });
    };
  } catch (error) {
    console.error("Unable to play pomodoro completion chime:", error);
  }
};

export interface PomodoroTimerState {
  mode: PomodoroSessionType;
  isRunning: boolean;
  remainingSeconds: number;
  totalSeconds: number;
  progress: number;
  focusStreak: number;
  focusTarget: number;
  upcomingMode: PomodoroSessionType;
  session: PomodoroSessionPublic | null;
  version: number;
  start: () => Promise<void>;
  pause: () => void;
  reset: () => Promise<void>;
  skip: () => Promise<void>;
  selectMode: (mode: PomodoroSessionType) => Promise<void>;
}

export const usePomodoroTimer = (settings: PomodoroSettings): PomodoroTimerState => {
  const [mode, setMode] = useState<PomodoroSessionType>("focus");
  const [session, setSession] = useState<PomodoroSessionPublic | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(() => settings.focusDuration * 60);
  const [focusStreak, setFocusStreak] = useState(() => loadFocusStreak(settings.cyclesBeforeLongBreak));
  const [version, setVersion] = useState(0);

  const intervalRef = useRef<number | null>(null);
  const sessionRef = useRef<PomodoroSessionPublic | null>(null);
  const actionLockRef = useRef(false);
  const completionPendingRef = useRef(false);

  const totalSeconds = useMemo(() => {
    let seconds = getDurationForMode(mode, settings) * 60;
    if (session && session.type === mode && typeof session.duration === "number") {
      seconds = session.duration * 60;
    }
    return seconds;
  }, [session, mode, settings]);

  const progress = useMemo(() => {
    if (!session && !isRunning) return 0;
    if (totalSeconds <= 0) return 0;
    const value = 1 - remainingSeconds / totalSeconds;
    return Math.min(1, Math.max(0, value));
  }, [remainingSeconds, totalSeconds, session, isRunning]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const updateFocusStreak = useCallback((value: number) => {
    setFocusStreak(value);
    persistFocusStreak(value);
  }, []);

  const applyModeDefaults = useCallback(
    (targetMode: PomodoroSessionType) => {
      const seconds = getDurationForMode(targetMode, settings) * 60;
      setRemainingSeconds(seconds);
    },
    [settings]
  );

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    // Adjust remaining time when settings change and no active session is running
    if (session || isRunning) return;
    applyModeDefaults(mode);
  }, [settings, mode, session, isRunning, applyModeDefaults]);

  useEffect(() => {
    // Clamp focus streak when cyclesBeforeLongBreak changes
    setFocusStreak((prev) => {
      const maxValue = Math.max(0, settings.cyclesBeforeLongBreak - 1);
      const next = Math.max(0, Math.min(prev, maxValue));
      if (next !== prev) {
        persistFocusStreak(next);
      }
      return next;
    });
  }, [settings.cyclesBeforeLongBreak]);

  const startSessionForMode = useCallback(
    async (targetMode: PomodoroSessionType, forceNew = false) => {
      const durationMinutes = getDurationForMode(targetMode, settings);
      const currentSession = sessionRef.current;
      const shouldCreateNew =
        forceNew || !currentSession || currentSession.type !== targetMode;

      if (shouldCreateNew) {
        const created = await storageOps.startPomodoroSession(targetMode, durationMinutes);
        if (!created) {
          return;
        }
        setSession(created);
        sessionRef.current = created;
        setMode(targetMode);
        setRemainingSeconds(durationMinutes * 60);
      } else if (currentSession) {
        setMode(currentSession.type);
      }

      setIsRunning(true);
    },
    [settings]
  );

  const finalizeSession = useCallback(
    async (reason: TransitionReason) => {
      if (actionLockRef.current) {
        return;
      }
      if (reason === "complete" && !sessionRef.current) {
        completionPendingRef.current = false;
        return;
      }
      actionLockRef.current = true;

      try {
        clearTimer();
        setIsRunning(false);

        const activeSession = sessionRef.current;
        let mutated = false;

        if (activeSession) {
          if (reason === "complete") {
            mutated = await storageOps.completePomodoroSession(activeSession.id, {
              completed: true,
              durationOverride: getDurationForMode(activeSession.type, settings),
            });
          } else {
            mutated = await storageOps.cancelPomodoroSession(activeSession.id);
          }
        }

        const currentForTransition = activeSession ? activeSession.type : mode;
        const { nextMode, nextFocusStreak } = computeNextState(
          currentForTransition,
          focusStreak,
          settings,
          reason
        );

        if (activeSession && reason === "complete" && currentForTransition === "focus") {
          updateFocusStreak(nextFocusStreak);
        }

        setSession(null);
        sessionRef.current = null;

        const targetMode = reason === "reset" ? mode : nextMode;
        setMode(targetMode);
        applyModeDefaults(targetMode);
        completionPendingRef.current = false;

        const shouldAutoStart =
          activeSession &&
          reason !== "reset" &&
          ((targetMode === "focus" && settings.autoStartFocus) ||
            (targetMode !== "focus" && settings.autoStartBreak));

        if (activeSession && reason === "complete" && settings.soundEnabled) {
          playCompletionChime();
        }

        if (mutated) {
          setVersion((prev) => prev + 1);
        }

        if (shouldAutoStart) {
          window.setTimeout(() => {
            void startSessionForMode(targetMode, true);
          }, 250);
        }
      } finally {
        actionLockRef.current = false;
      }
    },
    [
      mode,
      focusStreak,
      settings,
      clearTimer,
      updateFocusStreak,
      applyModeDefaults,
      startSessionForMode,
    ]
  );

  const start = useCallback(async () => {
    if (isRunning) return;
    await startSessionForMode(mode);
  }, [isRunning, mode, startSessionForMode]);

  const pause = useCallback(() => {
    setIsRunning(false);
    clearTimer();
  }, [clearTimer]);

  const reset = useCallback(async () => {
    await finalizeSession("reset");
  }, [finalizeSession]);

  const skip = useCallback(async () => {
    await finalizeSession("skip");
  }, [finalizeSession]);

  const selectMode = useCallback(
    async (targetMode: PomodoroSessionType) => {
      if (mode === targetMode && !session) {
        applyModeDefaults(targetMode);
        return;
      }

      completionPendingRef.current = false;
      clearTimer();
      setIsRunning(false);
      setMode(targetMode);
      applyModeDefaults(targetMode);

      if (session) {
        await storageOps.cancelPomodoroSession(session.id);
        setSession(null);
        sessionRef.current = null;
      }
    },
    [mode, session, clearTimer, applyModeDefaults]
  );

  useEffect(() => {
    if (!isRunning) {
      clearTimer();
      return;
    }

    clearTimer();
    intervalRef.current = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          completionPendingRef.current = true;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [isRunning, clearTimer]);

  useEffect(() => {
    if (!isRunning || !completionPendingRef.current || remainingSeconds > 0) {
      return;
    }
    completionPendingRef.current = false;
    void finalizeSession("complete");
  }, [remainingSeconds, finalizeSession, isRunning]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const active = await storageOps.getActivePomodoroSession();
      if (!mounted || !active) {
        return;
      }

      const durationSeconds = active.duration * 60;
      const elapsedSeconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(active.start_time).getTime()) / 1000)
      );
      const remaining = Math.max(0, durationSeconds - elapsedSeconds);

      if (remaining > 0) {
        setMode(active.type);
        setSession(active);
        setRemainingSeconds(remaining);
        setIsRunning(true);
      } else {
        sessionRef.current = active;
        setTimeout(() => {
          void finalizeSession("complete");
        }, 0);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const upcomingMode = useMemo(
    () => computeNextState(mode, focusStreak, settings, "complete").nextMode,
    [mode, focusStreak, settings]
  );

  return {
    mode,
    isRunning,
    remainingSeconds,
    totalSeconds,
    progress,
    focusStreak,
    focusTarget: settings.cyclesBeforeLongBreak,
    upcomingMode,
    session,
    version,
    start,
    pause,
    reset,
    skip,
    selectMode,
  };
};


