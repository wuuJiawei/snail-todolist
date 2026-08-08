import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SupabaseProjectCollaborationRepository } from "./supabaseProjectCollaborationRepository";

describe("SupabaseProjectCollaborationRepository", () => {
  it("maps member profiles from one embedded relation query", async () => {
    const memberQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
    };
    memberQuery.select.mockReturnValue(memberQuery);
    memberQuery.eq.mockReturnValue(memberQuery);
    memberQuery.order.mockResolvedValue({
      data: [{
        id: "member-1",
        project_id: "project-1",
        user_id: "user-1",
        role: "owner",
        created_at: null,
        profile: { id: "user-1", email: "owner@example.com", display_name: "Owner", avatar_url: null },
      }],
      error: null,
    });

    const client = { from: vi.fn(() => memberQuery) } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseProjectCollaborationRepository(client);

    await expect(repository.listMembers("project-1")).resolves.toEqual([{
      id: "member-1",
      projectId: "project-1",
      userId: "user-1",
      role: "owner",
      createdAt: undefined,
      profile: { id: "user-1", username: "Owner", avatar_url: null },
    }]);
    expect(memberQuery.select).toHaveBeenCalledWith(
      "id, project_id, user_id, role, created_at, profile:profiles!project_members_user_id_fkey(id, email, display_name, avatar_url)",
    );
    expect(client.from).toHaveBeenCalledTimes(1);
  });

  it("reuses a non-expired active share", async () => {
    const shareQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      gt: vi.fn(),
      maybeSingle: vi.fn(),
    };
    shareQuery.select.mockReturnValue(shareQuery);
    shareQuery.eq.mockReturnValue(shareQuery);
    shareQuery.gt.mockReturnValue(shareQuery);
    shareQuery.maybeSingle.mockResolvedValue({
      data: { id: "share-1", share_code: "ABC12345", expires_at: "2099-01-01T00:00:00.000Z", is_active: true },
      error: null,
    });

    const client = { from: vi.fn(() => shareQuery) } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseProjectCollaborationRepository(client);

    await expect(repository.getOrCreateShare("project-1", "user-1")).resolves.toEqual({
      id: "share-1",
      shareCode: "ABC12345",
      expiresAt: "2099-01-01T00:00:00.000Z",
      active: true,
    });
    expect(client.from).toHaveBeenCalledTimes(1);
  });
});
