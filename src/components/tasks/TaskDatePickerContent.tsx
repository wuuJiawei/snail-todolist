import React, { useEffect, useMemo, useState } from "react";
import { addDays, addMinutes, format, setHours, setMinutes, startOfDay, subDays } from "date-fns";
import { Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TaskDateValue } from "@/utils/taskDate";
import { formatTaskDateValue } from "@/utils/taskDate";
import { zhCN } from "date-fns/locale";

interface TaskDatePickerContentProps {
  value: TaskDateValue;
  onChange: (value: TaskDateValue) => void;
  removeLabel?: string;
  className?: string;
}

const timeValue = (date: Date) => format(date, "HH:mm");

const withTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return setMinutes(setHours(new Date(date), hours || 0), minutes || 0);
};

const nextHalfHour = () => {
  const now = new Date();
  now.setSeconds(0, 0);
  return addMinutes(now, 30 - (now.getMinutes() % 30));
};

const TaskDatePickerContent: React.FC<TaskDatePickerContentProps> = ({
  value,
  onChange,
  removeLabel = "清除",
  className,
}) => {
  const [draft, setDraft] = useState<TaskDateValue>(value);
  const [tab, setTab] = useState<"date" | "range">(value?.type === "range" ? "range" : "date");
  const [rangeEndpoint, setRangeEndpoint] = useState<"start" | "end">("start");

  useEffect(() => {
    setDraft(value);
    setTab(value?.type === "range" ? "range" : "date");
  }, [value]);

  const dateDraft = draft?.type === "range" ? undefined : draft;
  const rangeDraft = draft?.type === "range" ? draft : undefined;
  const selectedCalendarDate = tab === "range"
    ? rangeEndpoint === "start" ? rangeDraft?.start : rangeDraft?.end
    : dateDraft?.start;

  const ensureRange = () => {
    if (rangeDraft) return rangeDraft;
    const start = dateDraft?.type === "datetime" ? dateDraft.start : nextHalfHour();
    return { type: "range" as const, start, end: addMinutes(start, 30) };
  };

  const handleTabChange = (next: string) => {
    if (next !== "date" && next !== "range") return;
    setTab(next);
    if (next === "range") {
      setDraft(ensureRange());
      return;
    }
    const source = rangeDraft?.start ?? dateDraft?.start ?? startOfDay(new Date());
    setDraft({ type: "date", start: startOfDay(source) });
  };

  const setQuickDate = (date: Date) => {
    const current = dateDraft;
    if (current?.type === "datetime") {
      setDraft({ type: "datetime", start: withTime(date, timeValue(current.start)) });
    } else {
      setDraft({ type: "date", start: startOfDay(date) });
    }
  };

  const setDateTime = (time: string) => {
    const start = dateDraft?.start ?? startOfDay(new Date());
    if (!time) {
      setDraft({ type: "date", start: startOfDay(start) });
      return;
    }
    setDraft({ type: "datetime", start: withTime(start, time) });
  };

  const setRangeDate = (date?: Date) => {
    if (!date) return;
    const current = ensureRange();
    if (rangeEndpoint === "start") {
      const nextStart = withTime(date, timeValue(current.start));
      const duration = Math.max(30, (current.end.getTime() - current.start.getTime()) / 60000);
      setDraft({ ...current, start: nextStart, end: addMinutes(nextStart, duration) });
    } else {
      const nextEnd = withTime(date, timeValue(current.end));
      setDraft({ ...current, end: nextEnd > current.start ? nextEnd : addMinutes(current.start, 30) });
    }
  };

  const setRangeTime = (endpoint: "start" | "end", time: string) => {
    const current = ensureRange();
    if (endpoint === "start") {
      const start = withTime(current.start, time);
      const duration = Math.max(30, (current.end.getTime() - current.start.getTime()) / 60000);
      setDraft({ ...current, start, end: addMinutes(start, duration) });
    } else {
      const end = withTime(current.end, time);
      setDraft({ ...current, end: end > current.start ? end : addMinutes(current.start, 30) });
    }
  };

  const canConfirm = useMemo(() => {
    if (!draft) return false;
    return draft.type !== "range" || draft.end > draft.start;
  }, [draft]);

  return (
    <div className={className}>
      <Tabs value={tab} onValueChange={handleTabChange} className="w-[344px] p-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="date">日期</TabsTrigger>
          <TabsTrigger value="range">时间段</TabsTrigger>
        </TabsList>

        <TabsContent value="date" className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setQuickDate(new Date())}>今天</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setQuickDate(addDays(new Date(), 1))}>明天</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setQuickDate(subDays(new Date(), 1))}>昨天</Button>
          </div>
          <CalendarComponent
            mode="single"
            selected={dateDraft?.start}
            onSelect={(date) => date && setQuickDate(date)}
            className="w-full p-0"
            classNames={{ month: "w-full space-y-4", table: "w-full border-collapse" }}
            locale={zhCN}
          />
          <div className="flex items-center gap-3 border-t pt-3">
            <Clock3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">时间</span>
            <Input
              type="time"
              step={300}
              value={dateDraft?.type === "datetime" ? timeValue(dateDraft.start) : ""}
              onChange={(event) => setDateTime(event.target.value)}
              className="ml-auto h-8 w-28"
              aria-label="任务时间"
            />
          </div>
        </TabsContent>

        <TabsContent value="range" className="mt-3 space-y-3">
          {rangeDraft && (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                onClick={() => setRangeEndpoint("start")}
                className={`rounded-md border px-3 py-2 text-left text-sm ${rangeEndpoint === "start" ? "border-foreground" : "border-border"}`}
              >
                <span className="block text-xs text-muted-foreground">开始</span>
                {format(rangeDraft.start, "M月d日 EEE", { locale: zhCN })}
              </button>
              <Input
                type="time"
                step={300}
                value={timeValue(rangeDraft.start)}
                onFocus={() => setRangeEndpoint("start")}
                onChange={(event) => setRangeTime("start", event.target.value)}
                className="h-full w-28"
                aria-label="开始时间"
              />
              <button
                type="button"
                onClick={() => setRangeEndpoint("end")}
                className={`rounded-md border px-3 py-2 text-left text-sm ${rangeEndpoint === "end" ? "border-foreground" : "border-border"}`}
              >
                <span className="block text-xs text-muted-foreground">结束</span>
                {format(rangeDraft.end, "M月d日 EEE", { locale: zhCN })}
              </button>
              <Input
                type="time"
                step={300}
                value={timeValue(rangeDraft.end)}
                onFocus={() => setRangeEndpoint("end")}
                onChange={(event) => setRangeTime("end", event.target.value)}
                className="h-full w-28"
                aria-label="结束时间"
              />
            </div>
          )}
          <CalendarComponent
            mode="single"
            selected={selectedCalendarDate}
            onSelect={setRangeDate}
            className="w-full p-0"
            classNames={{ month: "w-full space-y-4", table: "w-full border-collapse" }}
            locale={zhCN}
          />
        </TabsContent>

        <div className="mt-3 border-t pt-3">
          <p className="mb-3 truncate text-xs text-muted-foreground">{formatTaskDateValue(draft)}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => onChange(undefined)}>{removeLabel}</Button>
            <Button type="button" onClick={() => onChange(draft)} disabled={!canConfirm}>确定</Button>
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default TaskDatePickerContent;
