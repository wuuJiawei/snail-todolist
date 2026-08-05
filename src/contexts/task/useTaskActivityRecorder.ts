import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as storageOps from "@/data/operations";
import { taskActivityKeys } from "@/queries/taskActivityQueries";
import type { Task } from "@/types/task";
import type { TaskActivityAction, TaskActivityInput } from "@/types/taskActivity";

const hasProp = <K extends keyof Partial<Task>>(obj: Partial<Task>, key: K): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);

const attachmentsSignature = (list: Task["attachments"] = []) =>
  JSON.stringify((list ?? []).map((attachment) => ({
    id: attachment.id,
    url: attachment.url,
    filename: attachment.filename,
  })));

const statusLabel = (completed?: boolean) => completed ? "completed" : "active";

export const buildTaskActivityDrafts = (
  previous: Task | undefined,
  updates: Partial<Task>,
): TaskActivityInput[] => {
  if (!previous) return [];
  const drafts: TaskActivityInput[] = [];

  if (hasProp(updates, "title") && updates.title !== previous.title) {
    drafts.push({ action: "title_updated", metadata: { from: previous.title ?? "", to: updates.title ?? "" } });
  }
  if (hasProp(updates, "description") && updates.description !== previous.description) {
    drafts.push({
      action: "description_updated",
      metadata: {
        previousLength: previous.description?.length ?? 0,
        nextLength: updates.description?.length ?? 0,
      },
    });
  }
  if (hasProp(updates, "completed") && updates.completed !== previous.completed) {
    drafts.push({
      action: "status_updated",
      metadata: { from: statusLabel(previous.completed), to: statusLabel(updates.completed) },
    });
  }
  if (hasProp(updates, "flagged") && updates.flagged !== previous.flagged) {
    drafts.push({
      action: updates.flagged ? "task_flagged" : "task_unflagged",
      metadata: { flagged: updates.flagged ?? false },
    });
  }
  if (hasProp(updates, "date") && updates.date !== previous.date) {
    drafts.push({ action: "due_date_updated", metadata: { from: previous.date ?? null, to: updates.date ?? null } });
  }
  if (hasProp(updates, "project") && updates.project !== previous.project) {
    drafts.push({ action: "project_changed", metadata: { from: previous.project ?? null, to: updates.project ?? null } });
  }
  if (
    hasProp(updates, "attachments") &&
    attachmentsSignature(previous.attachments) !== attachmentsSignature(updates.attachments)
  ) {
    drafts.push({
      action: "attachments_updated",
      metadata: {
        previousCount: previous.attachments?.length ?? 0,
        nextCount: updates.attachments?.length ?? 0,
      },
    });
  }
  return drafts;
};

export const useTaskActivityRecorder = () => {
  const queryClient = useQueryClient();
  const descriptionTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingDescriptions = useRef<Record<string, Record<string, unknown>>>({});

  return useCallback(async (
    taskId: string,
    action: TaskActivityAction,
    metadata?: Record<string, unknown>,
  ) => {
    if (action === "description_updated") {
      if (descriptionTimers.current[taskId]) clearTimeout(descriptionTimers.current[taskId]);
      pendingDescriptions.current[taskId] = metadata ?? {};
      descriptionTimers.current[taskId] = setTimeout(() => {
        const pending = pendingDescriptions.current[taskId];
        if (!pending) return;
        void storageOps
          .createTaskActivity({ task_id: taskId, action, metadata: pending })
          .then(() => queryClient.invalidateQueries({ queryKey: taskActivityKeys.byTask(taskId) }))
          .catch((error: unknown) => console.error("Failed to record task activity:", error));
        delete pendingDescriptions.current[taskId];
        delete descriptionTimers.current[taskId];
      }, 5000);
      return;
    }

    try {
      await storageOps.createTaskActivity({ task_id: taskId, action, metadata });
      await queryClient.invalidateQueries({ queryKey: taskActivityKeys.byTask(taskId) });
    } catch (error) {
      console.error("Failed to record task activity:", error);
    }
  }, [queryClient]);
};
