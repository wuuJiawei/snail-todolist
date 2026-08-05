import { describe, expect, it, vi } from "vitest";
import type { Database } from "./database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseChatRepository } from "./supabaseChatRepository";

describe("SupabaseChatRepository", () => {
  it("uses an anonymous client carrying the guest identity for guest messages", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });
    const anonymousClientFactory = vi
      .fn()
      .mockReturnValue({ from } as unknown as SupabaseClient<Database>);
    const repository = new SupabaseChatRepository(anonymousClientFactory);

    await repository.send({
      content: "hello",
      author: { name: "guest", avatarUrl: null },
      userId: null,
      anonymousId: "64e4054f-09bd-4d67-b681-7838db783d46",
    });

    expect(anonymousClientFactory).toHaveBeenCalledWith("64e4054f-09bd-4d67-b681-7838db783d46");
    expect(from).toHaveBeenCalledWith("global_chat_messages");
    expect(insert).toHaveBeenCalledWith({
      content: "hello",
      author_name: "guest",
      user_id: null,
      anonymous_id: "64e4054f-09bd-4d67-b681-7838db783d46",
    });
  });
});
