export function isTaskListInitiallyLoading(
  canLoad: boolean,
  tasksPending: boolean,
  taskCount: number,
  taskTagsPending: boolean,
): boolean {
  if (!canLoad) return false;
  return tasksPending || (taskCount > 0 && taskTagsPending);
}
