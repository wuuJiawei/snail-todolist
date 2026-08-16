import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SupabaseTaskRepository } from "./supabaseTaskRepository";

const taskRow = {
  id: "task-1",
  title: "Task",
  completed: false,
  user_id: "user-1",
  project: null,
  deleted: false,
  abandoned: false,
  flagged: false,
};

const authenticatedClient = (from: ReturnType<typeof vi.fn>) => ({
  auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null }) },
  from,
}) as unknown as SupabaseClient<Database>;

describe("SupabaseTaskRepository", () => {
  it("loads active tasks and their tags through the task query", async () => {
    const membershipQuery = { select: vi.fn(), eq: vi.fn() };
    membershipQuery.select.mockReturnValue(membershipQuery);
    membershipQuery.eq.mockResolvedValue({ data: [{ project_id: "project-2" }], error: null });
    const taskQuery = { select: vi.fn(), or: vi.fn(), eq: vi.fn(), order: vi.fn() };
    taskQuery.select.mockReturnValue(taskQuery);
    taskQuery.or.mockReturnValue(taskQuery);
    taskQuery.eq.mockReturnValue(taskQuery);
    taskQuery.order.mockReturnValueOnce(taskQuery).mockResolvedValueOnce({
      data: [{
        ...taskRow,
        task_tags: [{ tag: { id: "tag-1", name: "Urgent", user_id: "user-1", project_id: null } }],
      }],
      error: null,
    });
    const from = vi.fn().mockReturnValueOnce(membershipQuery).mockReturnValueOnce(taskQuery);
    const repository = new SupabaseTaskRepository(authenticatedClient(from));

    await expect(repository.findAll()).resolves.toEqual([
      expect.objectContaining({
        id: "task-1",
        attachments: [],
        tags: [expect.objectContaining({ id: "tag-1", name: "Urgent" })],
      }),
    ]);
    expect(taskQuery.select).toHaveBeenCalledWith("*, task_tags(tag:tags(*))");
    expect(taskQuery.or).toHaveBeenCalledWith("user_id.eq.user-1,project.in.(project-2)");
    expect(taskQuery.eq).toHaveBeenCalledWith("deleted", false);
    expect(taskQuery.eq).toHaveBeenCalledWith("abandoned", false);
  });

  it("creates a personal task at the top of its list", async () => {
    const orderQuery = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), order: vi.fn(), limit: vi.fn() };
    orderQuery.select.mockReturnValue(orderQuery);
    orderQuery.eq.mockReturnValue(orderQuery);
    orderQuery.is.mockReturnValue(orderQuery);
    orderQuery.order.mockReturnValue(orderQuery);
    orderQuery.limit.mockResolvedValue({ data: [{ sort_order: 1000 }], error: null });
    const insertQuery = { insert: vi.fn(), select: vi.fn(), single: vi.fn() };
    insertQuery.insert.mockReturnValue(insertQuery);
    insertQuery.select.mockReturnValue(insertQuery);
    insertQuery.single.mockResolvedValue({ data: { ...taskRow, sort_order: 0, attachments: "[]" }, error: null });
    const from = vi.fn().mockReturnValueOnce(orderQuery).mockReturnValueOnce(insertQuery);
    const repository = new SupabaseTaskRepository(authenticatedClient(from));

    await repository.create({
      title: "Task",
      completed: false,
      attachments: [],
      date: "2026-08-14T09:00:00.000Z",
      dateType: "range",
      endDate: "2026-08-14T10:00:00.000Z",
    });

    expect(orderQuery.is).toHaveBeenCalledWith("project", null);
    expect(insertQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      title: "Task",
      user_id: "user-1",
      sort_order: 0,
      attachments: "[]",
      date: "2026-08-14T09:00:00.000Z",
      date_type: "range",
      end_date: "2026-08-14T10:00:00.000Z",
    }));
  });

  it("allows a shared-project member to update a task", async () => {
    const taskLookup = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
    taskLookup.select.mockReturnValue(taskLookup);
    taskLookup.eq.mockReturnValue(taskLookup);
    taskLookup.maybeSingle.mockResolvedValue({
      data: { id: "task-1", user_id: "user-2", project: "project-1" },
      error: null,
    });
    const membershipQuery = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
    membershipQuery.select.mockReturnValue(membershipQuery);
    membershipQuery.eq.mockReturnValue(membershipQuery);
    membershipQuery.maybeSingle.mockResolvedValue({ data: { role: "member" }, error: null });
    const updateQuery = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() };
    updateQuery.update.mockReturnValue(updateQuery);
    updateQuery.eq.mockReturnValue(updateQuery);
    updateQuery.select.mockReturnValue(updateQuery);
    updateQuery.maybeSingle.mockResolvedValue({ data: { ...taskRow, title: "Next" }, error: null });
    const from = vi.fn()
      .mockReturnValueOnce(taskLookup)
      .mockReturnValueOnce(membershipQuery)
      .mockReturnValueOnce(updateQuery);
    const repository = new SupabaseTaskRepository(authenticatedClient(from));

    await expect(repository.update("task-1", {
      title: "Next",
      dateType: "datetime",
      endDate: undefined,
    })).resolves.toMatchObject({ title: "Next" });
    expect(updateQuery.update).toHaveBeenCalledWith({
      title: "Next",
      date_type: "datetime",
      end_date: null,
    });
  });

  it("clears trash metadata when restoring a task", async () => {
    const taskLookup = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
    taskLookup.select.mockReturnValue(taskLookup);
    taskLookup.eq.mockReturnValue(taskLookup);
    taskLookup.maybeSingle.mockResolvedValue({ data: taskRow, error: null });
    const updateQuery = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() };
    updateQuery.update.mockReturnValue(updateQuery);
    updateQuery.eq.mockReturnValue(updateQuery);
    updateQuery.select.mockReturnValue(updateQuery);
    updateQuery.maybeSingle.mockResolvedValue({ data: taskRow, error: null });
    const from = vi.fn().mockReturnValueOnce(taskLookup).mockReturnValueOnce(updateQuery);
    const repository = new SupabaseTaskRepository(authenticatedClient(from));

    await repository.restore("task-1");

    expect(updateQuery.update).toHaveBeenCalledWith({ deleted: false, deleted_at: null });
  });

  it("rejects permanent deletion by a non-owner project member", async () => {
    const taskLookup = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
    taskLookup.select.mockReturnValue(taskLookup);
    taskLookup.eq.mockReturnValue(taskLookup);
    taskLookup.maybeSingle.mockResolvedValue({
      data: { id: "task-1", user_id: "user-2", project: "project-1" },
      error: null,
    });
    const membershipQuery = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
    membershipQuery.select.mockReturnValue(membershipQuery);
    membershipQuery.eq.mockReturnValue(membershipQuery);
    membershipQuery.maybeSingle.mockResolvedValue({ data: { role: "member" }, error: null });
    const from = vi.fn().mockReturnValueOnce(taskLookup).mockReturnValueOnce(membershipQuery);
    const repository = new SupabaseTaskRepository(authenticatedClient(from));

    await expect(repository.remove("task-1")).rejects.toMatchObject({
      name: "DataError",
      code: "FORBIDDEN",
    });
    expect(from).toHaveBeenCalledTimes(2);
  });

  it("converts a missing task to the unified not-found error", async () => {
    const taskLookup = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
    taskLookup.select.mockReturnValue(taskLookup);
    taskLookup.eq.mockReturnValue(taskLookup);
    taskLookup.maybeSingle.mockResolvedValue({ data: null, error: null });
    const repository = new SupabaseTaskRepository(authenticatedClient(vi.fn(() => taskLookup)));

    await expect(repository.update("missing", { title: "Next" })).rejects.toMatchObject({
      name: "DataError",
      code: "NOT_FOUND",
    });
  });
});
