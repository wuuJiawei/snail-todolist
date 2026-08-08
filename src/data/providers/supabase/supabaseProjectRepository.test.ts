import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SupabaseProjectRepository } from "./supabaseProjectRepository";

const projectRow = {
  id: "project-1",
  name: "Inbox",
  icon: "folder",
  color: "#4CAF50",
  view_type: "list",
  created_at: "2026-08-05T00:00:00.000Z",
  updated_at: "2026-08-05T00:00:00.000Z",
  user_id: "user-1",
  sort_order: 3000,
  is_shared: false,
  original_owner_id: null,
};

describe("SupabaseProjectRepository", () => {
  it("loads owned project membership metadata without a follow-up member query", async () => {
    const ownedQuery = { select: vi.fn(), eq: vi.fn(), order: vi.fn() };
    ownedQuery.select.mockReturnValue(ownedQuery);
    ownedQuery.eq.mockReturnValue(ownedQuery);
    ownedQuery.order.mockReturnValueOnce(ownedQuery).mockResolvedValueOnce({
      data: [{ ...projectRow, members: [{ user_id: "user-1" }, { user_id: "user-2" }] }],
      error: null,
    });
    const membershipQuery = { select: vi.fn(), eq: vi.fn(), order: vi.fn() };
    membershipQuery.select.mockReturnValue(membershipQuery);
    membershipQuery.eq.mockReturnValue(membershipQuery);
    membershipQuery.order.mockResolvedValue({ data: [], error: null });
    const from = vi.fn().mockReturnValueOnce(ownedQuery).mockReturnValueOnce(membershipQuery);
    const client = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null }) },
      from,
    } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseProjectRepository(client);

    await expect(repository.findAll()).resolves.toEqual([
      expect.objectContaining({ id: "project-1", isShared: true }),
    ]);
    expect(ownedQuery.select).toHaveBeenCalledWith("*, members:project_members(user_id)");
    expect(from).toHaveBeenCalledTimes(2);
  });

  it("creates a project after the current maximum sort order", async () => {
    const orderQuery = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() };
    orderQuery.select.mockReturnValue(orderQuery);
    orderQuery.eq.mockReturnValue(orderQuery);
    orderQuery.order.mockReturnValue(orderQuery);
    orderQuery.limit.mockResolvedValue({ data: [{ sort_order: 2000 }], error: null });
    const insertQuery = { insert: vi.fn(), select: vi.fn(), single: vi.fn() };
    insertQuery.insert.mockReturnValue(insertQuery);
    insertQuery.select.mockReturnValue(insertQuery);
    insertQuery.single.mockResolvedValue({ data: projectRow, error: null });
    const client = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null }) },
      from: vi.fn().mockReturnValueOnce(orderQuery).mockReturnValueOnce(insertQuery),
    } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseProjectRepository(client);

    await expect(repository.create({ name: "Inbox", icon: "folder" })).resolves.toEqual({
      id: "project-1", name: "Inbox", icon: "folder", color: "#4CAF50", viewType: "list",
      createdAt: "2026-08-05T00:00:00.000Z", updatedAt: "2026-08-05T00:00:00.000Z",
      ownerId: "user-1", sortOrder: 3000, isShared: false, count: 0,
    });
    expect(insertQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      name: "Inbox",
      user_id: "user-1",
      sort_order: 3000,
    }));
  });

  it("maps a missing update to the unified not-found error", async () => {
    const query = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() };
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({ data: null, error: null });
    const client = { from: vi.fn(() => query) } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseProjectRepository(client);

    await expect(repository.update("missing", { name: "Next" })).rejects.toMatchObject({
      name: "DataError",
      code: "NOT_FOUND",
    });
  });

  it("persists only database-backed update fields", async () => {
    const updated = { ...projectRow, name: "Next" };
    const query = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() };
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({ data: updated, error: null });
    const client = { from: vi.fn(() => query) } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseProjectRepository(client);

    await repository.update("project-1", {
      name: "Next",
      count: 99,
      members: [],
      isFixed: true,
    } as never);

    expect(query.update).toHaveBeenCalledWith({
      name: "Next",
      updated_at: expect.any(String),
    });
  });
});
