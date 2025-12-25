import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Trash2,
  Settings,
  BarChart3,
  TimerReset,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import CircularProgress from "@/components/ui/circular-progress";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { usePomodoroSettings } from "@/hooks/usePomodoroSettings";
import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";
import { usePomodoroHistory } from "@/hooks/usePomodoroHistory";
import type { PomodoroSessionType } from "@/storage/operations";

const MODE_LABELS: Record<PomodoroSessionType, string> = {
  focus: "专注",
  short_break: "短休",
  long_break: "长休",
};

const MODE_DESCRIPTIONS: Record<PomodoroSessionType, string> = {
  focus: "沉浸工作或学习，完成一个专注时段。",
  short_break: "短暂放松，缓解压力、补充能量。",
  long_break: "经过多轮专注后的深度休息，彻底放松身心。",
};

const formatDuration = (minutes: number) => `${minutes} 分钟`;

const formatTimer = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const Pomodoro = () => {
  const { settings, updateSettings, resetSettings, isReady } = usePomodoroSettings();
  const timer = usePomodoroTimer(settings);
  const {
    today: todayStats,
    recentSessions,
    refresh: refreshHistory,
    removeSession,
  } = usePomodoroHistory({ includeHeatmap: false });
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [panel, setPanel] = useState<"none" | "stats" | "settings">("none");

  useEffect(() => {
    if (timer.version > 0) {
      void refreshHistory();
    }
  }, [timer.version, refreshHistory]);

  useEffect(() => {
    if (isReady) {
      setSettingsDirty(false);
    }
  }, [isReady]);

  useEffect(() => {
    if (panel === "stats") {
      void refreshHistory();
    }
  }, [panel, refreshHistory]);

  const formattedTime = useMemo(() => formatTimer(timer.remainingSeconds), [timer.remainingSeconds]);
  const upcomingLabel = MODE_LABELS[timer.upcomingMode];
  const handleToggle = async () => {
    if (timer.isRunning) {
      timer.pause();
      return;
    }
    await timer.start();
  };

  const handleReset = async () => {
    await timer.reset();
  };

  const handleSkip = async () => {
    await timer.skip();
  };

  const handleModeSelect = async (mode: PomodoroSessionType) => {
    await timer.selectMode(mode);
  };

  const handleNumberChange =
    (key: "focusDuration" | "shortBreakDuration" | "longBreakDuration" | "cyclesBeforeLongBreak") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      if (!Number.isNaN(value) && value > 0) {
        updateSettings({ [key]: value });
        setSettingsDirty(true);
      }
    };

  const focusRemaining =
    timer.mode === "long_break"
      ? settings.cyclesBeforeLongBreak
      : Math.max(0, settings.cyclesBeforeLongBreak - timer.focusStreak);

  const focusSessionsTotal = useMemo(
    () => todayStats.sessions.filter((item) => item.type === "focus").length,
    [todayStats.sessions]
  );

  const completionRate = useMemo(() => {
    if (focusSessionsTotal === 0) return 0;
    const rate = (todayStats.focusCount / focusSessionsTotal) * 100;
    return Number.isFinite(rate) ? Math.round(rate) : 0;
  }, [focusSessionsTotal, todayStats.focusCount]);

  const sessionStatusLabel = timer.session
    ? timer.isRunning
      ? "计时中"
      : "已暂停"
    : "未开始";

  return (
    <div className="relative flex h-screen w-full items-center justify-center">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setPanel("stats")}>
          <BarChart3 className="mr-2 h-4 w-4" /> 统计
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setPanel("settings")}>
          <Settings className="mr-2 h-4 w-4" /> 设置
        </Button>
      </div>

      <div className="flex flex-col items-center gap-8">
        <div className="flex items-center gap-2">
          {(["focus", "short_break", "long_break"] as PomodoroSessionType[]).map((item) => (
            <Button
              key={item}
              variant={timer.mode === item ? "default" : "outline"}
              size="sm"
              className="h-9 px-4"
              onClick={() => void handleModeSelect(item)}
            >
              {MODE_LABELS[item]}
            </Button>
          ))}
        </div>

        <CircularProgress value={timer.progress} size={300} thickness={24}>
          <div className="flex flex-col items-center gap-2">
            <span className="text-6xl font-semibold tracking-tight">{formattedTime}</span>
            <span className="text-xs text-muted-foreground">
              {MODE_LABELS[timer.mode]} · {sessionStatusLabel}
            </span>
            <span className="text-[11px] text-muted-foreground">
              即将进入 {upcomingLabel} · 距长休 {Math.max(0, focusRemaining)} 轮
            </span>
          </div>
        </CircularProgress>

        <div className="flex items-center justify-center gap-3">
          <Button size="lg" className="min-w-[150px]" onClick={handleToggle}>
            {timer.isRunning ? (
              <Pause className="mr-2 h-5 w-5" />
            ) : (
              <Play className="mr-2 h-5 w-5" />
            )}
            {timer.isRunning ? "暂停" : "开始"}
          </Button>
          <Button variant="outline" size="lg" className="min-w-[150px]" onClick={handleSkip}>
            <SkipForward className="mr-2 h-5 w-5" />
            跳过
          </Button>
          <Button variant="ghost" size="lg" className="min-w-[150px]" onClick={handleReset}>
            <RotateCcw className="mr-2 h-5 w-5" />
            重置当前
          </Button>
        </div>
      </div>

      <Drawer
        shouldScaleBackground={false}
        open={panel !== "none"}
        onOpenChange={(open) => {
          if (!open) setPanel("none");
        }}
      >
        <DrawerContent className="max-h-[80vh] overflow-y-auto">
          <DrawerHeader className="sticky top-0 z-10 bg-background border-b">
            <DrawerTitle>{panel === "stats" ? "今日统计" : "计时设置"}</DrawerTitle>
            <DrawerDescription>
              {panel === "stats" ? "回顾今天的番茄记录" : "根据你的节奏调整参数"}
            </DrawerDescription>
          </DrawerHeader>

          {panel === "stats" ? (
            <div className="px-4 pb-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border bg-background p-4">
                  <div className="text-muted-foreground">专注分钟</div>
                  <div className="mt-2 text-2xl font-semibold">{todayStats.focusMinutes}</div>
                  <div className="text-xs text-muted-foreground">完成 {todayStats.focusCount} 次番茄</div>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <div className="text-muted-foreground">休息分钟</div>
                  <div className="mt-2 text-2xl font-semibold">{todayStats.breakMinutes}</div>
                  <div className="text-xs text-muted-foreground">休息 {todayStats.breakCount} 次</div>
                </div>
              </div>

              <div className="rounded-lg border bg-background p-4 text-sm">
                <div className="text-muted-foreground">完成率</div>
                <div className="mt-2 text-3xl font-semibold">{completionRate}%</div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">最近会话（{recentSessions.length}）</div>
                <div className="pr-2">
                  <div className="space-y-3">
                    {recentSessions.length === 0 && (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        暂无记录，开始一次番茄钟试试吧。
                      </div>
                    )}
                    {recentSessions.map((session) => {
                      const startedAt = format(new Date(session.start_time), "MM/dd HH:mm");
                      return (
                        <div
                          key={session.id}
                          className="flex items-start justify-between rounded-lg border bg-background p-4"
                        >
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {MODE_LABELS[session.type]} · {formatDuration(session.duration)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {session.completed ? "已完成" : "未完成"} · {startedAt}
                              {session.end_time ? ` · 结束于 ${format(new Date(session.end_time), "HH:mm")}` : ""}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => void removeSession(session.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">删除会话</span>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 pb-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="focusDuration">专注时长 (分钟)</Label>
                  <Input
                    id="focusDuration"
                    type="number"
                    min={1}
                    max={180}
                    value={settings.focusDuration}
                    onChange={handleNumberChange("focusDuration")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shortBreakDuration">短休时长 (分钟)</Label>
                  <Input
                    id="shortBreakDuration"
                    type="number"
                    min={1}
                    max={60}
                    value={settings.shortBreakDuration}
                    onChange={handleNumberChange("shortBreakDuration")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longBreakDuration">长休时长 (分钟)</Label>
                  <Input
                    id="longBreakDuration"
                    type="number"
                    min={1}
                    max={60}
                    value={settings.longBreakDuration}
                    onChange={handleNumberChange("longBreakDuration")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cyclesBeforeLongBreak">长休前的专注轮数</Label>
                  <Input
                    id="cyclesBeforeLongBreak"
                    type="number"
                    min={1}
                    max={12}
                    value={settings.cyclesBeforeLongBreak}
                    onChange={handleNumberChange("cyclesBeforeLongBreak")}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-4">
                  <div>
                    <div className="text-sm font-medium">专注自动开始</div>
                    <div className="text-xs text-muted-foreground">进入专注阶段时自动启动计时器。</div>
                  </div>
                  <Switch
                    checked={settings.autoStartFocus}
                    onCheckedChange={(value) => {
                      updateSettings({ autoStartFocus: value });
                      setSettingsDirty(true);
                    }}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-4">
                  <div>
                    <div className="text-sm font-medium">休息自动开始</div>
                    <div className="text-xs text-muted-foreground">完成专注后是否自动进入休息。</div>
                  </div>
                  <Switch
                    checked={settings.autoStartBreak}
                    onCheckedChange={(value) => {
                      updateSettings({ autoStartBreak: value });
                      setSettingsDirty(true);
                    }}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-4 md:col-span-2">
                  <div>
                    <div className="text-sm font-medium">完成提示音</div>
                    <div className="text-xs text-muted-foreground">每次阶段结束时播放提示音提醒。</div>
                  </div>
                  <Switch
                    checked={settings.soundEnabled}
                    onCheckedChange={(value) => {
                      updateSettings({ soundEnabled: value });
                      setSettingsDirty(true);
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
                <div>
                  {settingsDirty ? "设置已更新，新的计时将在下一轮生效。" : "设置与默认一致，可随时调整适合自己的节奏。"}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetSettings();
                    setSettingsDirty(false);
                  }}
                >
                  <TimerReset className="mr-1 h-4 w-4" /> 恢复默认
                </Button>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Pomodoro;
