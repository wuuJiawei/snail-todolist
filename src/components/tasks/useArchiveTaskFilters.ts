import { useCallback, useEffect, useMemo, useState } from "react";
import { endOfDay, isValid, startOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { Task } from "@/types/task";

interface UseArchiveTaskFiltersOptions {
  tasks: Task[];
  getTimestamp: (task: Task) => string | undefined;
  storageKey: string;
}

export const useArchiveTaskFilters = ({ tasks, getTimestamp, storageKey }: UseArchiveTaskFiltersOptions) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  useEffect(() => {
    const savedFilters = localStorage.getItem(storageKey);
    if (!savedFilters) return;

    try {
      const parsedFilters = JSON.parse(savedFilters);
      const from = parsedFilters.dateRange?.from ? new Date(parsedFilters.dateRange.from) : undefined;
      const to = parsedFilters.dateRange?.to ? new Date(parsedFilters.dateRange.to) : undefined;
      if (from && isValid(from)) {
        setDateRange({ from, to: to && isValid(to) ? to : undefined });
      }
    } catch (error) {
      console.error("Error parsing saved archive filters:", error);
    }
  }, [storageKey]);

  const updateDateRange = useCallback((range: DateRange | undefined) => {
    setDateRange(range);
    try {
      const savedFilters = JSON.parse(localStorage.getItem(storageKey) || "{}");
      localStorage.setItem(storageKey, JSON.stringify({
        ...savedFilters,
        dateRange: range ? {
          from: range.from?.toISOString(),
          to: range.to?.toISOString(),
        } : undefined,
      }));
    } catch (error) {
      console.error("Error saving archive filters:", error);
    }
  }, [storageKey]);

  const clearFilters = useCallback(() => {
    updateDateRange(undefined);
    setSelectedProjects([]);
    localStorage.setItem(`${storageKey}.projects`, "[]");
  }, [storageKey, updateDateRange]);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const timestamp = getTimestamp(task);
    const eventDate = timestamp ? new Date(timestamp) : null;
    const matchesDateRange =
      (!dateRange?.from || (eventDate && eventDate >= startOfDay(dateRange.from))) &&
      (!dateRange?.to || (eventDate && eventDate <= endOfDay(dateRange.to)));
    const matchesProjects =
      selectedProjects.length === 0 || selectedProjects.includes(task.project || "");
    return Boolean(matchesDateRange && matchesProjects);
  }), [dateRange, getTimestamp, selectedProjects, tasks]);

  return {
    dateRange,
    selectedProjects,
    filteredTasks,
    filterActive: Boolean(dateRange || selectedProjects.length > 0),
    setSelectedProjects,
    updateDateRange,
    clearFilters,
  };
};
