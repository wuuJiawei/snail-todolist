import { useCallback, useEffect, useMemo, useState } from "react";
import { POMODORO_SETTINGS_KEY } from "@/constants/storage-keys";

export interface PomodoroSettings {
  focusDuration: number; // minutes
  shortBreakDuration: number; // minutes
  longBreakDuration: number; // minutes
  cyclesBeforeLongBreak: number;
  autoStartFocus: boolean;
  autoStartBreak: boolean;
  soundEnabled: boolean;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  cyclesBeforeLongBreak: 4,
  autoStartFocus: false,
  autoStartBreak: true,
  soundEnabled: true,
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(value)));

const sanitizeSettings = (settings: Partial<PomodoroSettings>): PomodoroSettings => {
  return {
    focusDuration: clampNumber(settings.focusDuration ?? DEFAULT_SETTINGS.focusDuration, 1, 180),
    shortBreakDuration: clampNumber(settings.shortBreakDuration ?? DEFAULT_SETTINGS.shortBreakDuration, 1, 60),
    longBreakDuration: clampNumber(settings.longBreakDuration ?? DEFAULT_SETTINGS.longBreakDuration, 1, 60),
    cyclesBeforeLongBreak: clampNumber(
      settings.cyclesBeforeLongBreak ?? DEFAULT_SETTINGS.cyclesBeforeLongBreak,
      1,
      12
    ),
    autoStartFocus: settings.autoStartFocus ?? DEFAULT_SETTINGS.autoStartFocus,
    autoStartBreak: settings.autoStartBreak ?? DEFAULT_SETTINGS.autoStartBreak,
    soundEnabled: settings.soundEnabled ?? DEFAULT_SETTINGS.soundEnabled,
  };
};

export interface UsePomodoroSettingsResult {
  settings: PomodoroSettings;
  isReady: boolean;
  updateSettings: (partial: Partial<PomodoroSettings>) => void;
  resetSettings: () => void;
  defaults: PomodoroSettings;
}

export const usePomodoroSettings = (): UsePomodoroSettingsResult => {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(POMODORO_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PomodoroSettings>;
        setSettings(sanitizeSettings(parsed));
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error("Failed to read pomodoro settings:", error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    try {
      localStorage.setItem(POMODORO_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to persist pomodoro settings:", error);
    }
  }, [settings, isReady]);

  const updateSettings = useCallback((partial: Partial<PomodoroSettings>) => {
    setSettings((prev) => sanitizeSettings({ ...prev, ...partial }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem(POMODORO_SETTINGS_KEY);
    } catch (error) {
      console.error("Failed to reset pomodoro settings:", error);
    }
  }, []);

  const defaults = useMemo(() => DEFAULT_SETTINGS, []);

  return {
    settings,
    isReady,
    updateSettings,
    resetSettings,
    defaults,
  };
};


