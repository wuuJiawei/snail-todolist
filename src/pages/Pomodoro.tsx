
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  RefreshCw,
  Trash2,
  TimerReset,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import CircularProgress from "@/components/ui/circular-progress";
import { usePomodoroSettings } from "@/hooks/usePomodoroSettings";
import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";
import { usePomodoroHistory } from "@/hooks/usePomodoroHistory";
import { PomodoroSessionType } from "@/services/pomodoroService";

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
    weekly: weeklySummary,
    recentSessions,
    loading: historyLoading,
    refresh: refreshHistory,
    removeSession,
  } = usePomodoroHistory();
  const [settingsDirty, setSettingsDirty] = useState(false);

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

  const maxFocusMinutes =
    weeklySummary.days.reduce((max, day) => Math.max(max, day.focusMinutes), 0) || 1;

  const focusRemaining =
    timer.mode === "long_break"
      ? settings.cyclesBeforeLongBreak
      : Math.max(0, settings.cyclesBeforeLongBreak - timer.focusStreak);

  const sessionStatusLabel = timer.session
    ? timer.isRunning
      ? "计时中"
      : "已暂停"
    : "未开始";

  return (
    <div className="w-full space-y-8 px-6 py-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
        <Card className="h-full shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-2xl font-semibold">番茄钟</CardTitle>
                <CardDescription>
                  参考滴答清单的番茄工作法：自动循环专注与休息，并同步历史记录。
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
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
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-stretch lg:justify-between">
              <div className="flex flex-col items-center gap-6">
                <CircularProgress value={timer.progress} size={260} thickness={22}>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs uppercase text-muted-foreground tracking-widest">
                      当前阶段
                    </span>
                    <span className="text-5xl font-semibold tracking-tight">{formattedTime}</span>
                    <span className="text-xs text-muted-foreground">
                      {MODE_LABELS[timer.mode]} · {sessionStatusLabel}
                    </span>
                  </div>
                </CircularProgress>

                <div className="flex flex-wrap items-center justify-center gap-3">
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

                <div className="text-sm text-muted-foreground">
                  即将进入：<span className="font-medium text-foreground">{upcomingLabel}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  距离长休还差{" "}
                  <span className="font-semibold text-foreground">
                    {Math.max(0, focusRemaining)}
                  </span>{" "}
                  轮专注
                </div>
                {timer.session && (
                  <div className="text-xs text-muted-foreground">
                    开始时间：{format(new Date(timer.session.start_time), "HH:mm")}
                  </div>
                )}
              </div>

              <Separator orientation="vertical" className="hidden h-auto lg:block" />

              <div className="flex w-full flex-col gap-4 rounded-xl bg-muted/40 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {MODE_LABELS[timer.mode]}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {MODE_DESCRIPTIONS[timer.mode]}
                    </span>
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {timer.session ? "正在记录" : "待开始"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg border bg-background p-4 shadow-sm">
                    <div className="text-xs uppercase text-muted-foreground tracking-wide">
                      今日专注
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-primary">
                      {todayStats.focusMinutes} 分钟
                    </div>
                    <div className="text-xs text-muted-foreground">
                      已完成 {todayStats.focusCount} 次番茄
                    </div>
                  </div>
                  <div className="rounded-lg border bg-background p-4 shadow-sm">
                    <div className="text-xs uppercase text-muted-foreground tracking-wide">
                      今日休息
                    </div>
                    <div className="mt-2 text-2xl font-semibold">
                      {todayStats.breakMinutes} 分钟
                    </div>
                    <div className="text-xs text-muted-foreground">
                      休息 {todayStats.breakCount} 次
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground md:grid-cols-3">
                  <div className="rounded-md bg-background p-3">
                    <div className="text-[10px] uppercase">循环目标</div>
                    <div className="mt-1 text-base font-medium text-foreground">
                      每 {settings.cyclesBeforeLongBreak} 次专注长休
                    </div>
                  </div>
                  <div className="rounded-md bg-background p-3">
                    <div className="text-[10px] uppercase">自动开始</div>
                    <div className="mt-1 text-base font-medium text-foreground">
                      {settings.autoStartFocus ? "专注自动开始 · " : ""}
                      {settings.autoStartBreak ? "休息自动开始" : "休息手动开始"}
                      {!settings.autoStartFocus && !settings.autoStartBreak && "全部手动"}
                    </div>
                  </div>
                  <div className="rounded-md bg-background p-3">
                    <div className="text-[10px] uppercase">提示音</div>
                    <div className="mt-1 text-base font-medium text-foreground">
                      {settings.soundEnabled ? "结束播放提示音" : "静音模式"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="h-full shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">今日概览</CardTitle>
              <CardDescription>快速回顾今天完成的番茄钟与专注时长。</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => void refreshHistory()}>
                <RefreshCw className="h-4 w-4" />
                <span className="sr-only">刷新统计</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {historyLoading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            )}
            {!historyLoading && (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg border bg-background p-4 shadow-sm">
                    <div className="text-muted-foreground">专注次数</div>
                    <div className="mt-2 text-3xl font-semibold">
                      {todayStats.focusCount}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-background p-4 shadow-sm">
                    <div className="text-muted-foreground">完成率</div>
                    <div className="mt-2 text-3xl font-semibold">
                      {todayStats.sessions.length
                        ? Math.round(
                            (todayStats.focusCount /
                              todayStats.sessions.filter((item) => item.type === "focus")
                                .length) *
                              100
                          )
                        : 0}
                      %
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">近七天专注趋势</h4>
                  <div className="space-y-3">
                    {weeklySummary.days.map((day) => {
                      const dayDate = new Date(`${day.date}T00:00:00`);
                      const focusPercent = Math.min(
                        100,
                        Math.round((day.focusMinutes / maxFocusMinutes) * 100)
                      );
                      return (
                        <div key={day.date} className="space-y-1">
                          <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                            <span>{format(dayDate, "MM/dd EEE")}</span>
                            <span>{day.focusMinutes} 分钟</span>
                          </div>
                          <Progress value={focusPercent} />
                          <div className="text-[11px] text-muted-foreground">
                            休息 {day.breakMinutes} 分钟
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="h-full shadow-sm">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-xl">计时设置</CardTitle>
              <CardDescription>根据自己的节奏调整番茄时长与自动化行为。</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
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

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-4">
                <div>
                  <div className="text-sm font-medium">专注自动开始</div>
                  <div className="text-xs text-muted-foreground">
                    进入专注阶段时自动启动计时器。
                  </div>
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
                  <div className="text-xs text-muted-foreground">
                    完成专注后是否自动进入休息。
                  </div>
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
                  <div className="text-xs text-muted-foreground">
                    每次阶段结束时播放提示音提醒。
                  </div>
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
                {settingsDirty
                  ? "设置已更新，新的计时将在下一轮生效。"
                  : "设置与默认一致，可随时调整适合自己的节奏。"}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  resetSettings();
                  setSettingsDirty(false);
                }}
              >
                <TimerReset className="mr-1 h-4 w-4" />
                恢复默认
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">最近会话</CardTitle>
                <CardDescription>查看刚刚完成或取消的番茄钟，可快速清理错误记录。</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                共 {recentSessions.length} 条
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[360px] pr-2">
              <div className="space-y-4">
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
                      className="flex items-start justify-between rounded-lg border bg-background p-4 shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={session.completed ? "default" : "secondary"}>
                            {MODE_LABELS[session.type]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {session.completed ? "已完成" : "未完成"}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-foreground">
                          {formatDuration(session.duration)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {startedAt}
                          {session.end_time
                            ? ` · 结束于 ${format(new Date(session.end_time), "HH:mm")}`
                            : ""}
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
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Pomodoro;
