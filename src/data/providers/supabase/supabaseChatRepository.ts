import type { ChatMessage, ChatPresence, ChatRepository } from "@/data/contracts/chatRepository";
import { supabase } from "@/integrations/supabase/client";
import { ENV_CONFIG } from "@/config/env";
import type { Database } from "@/integrations/supabase/types";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { withSupabaseError } from "./mapSupabaseError";

interface ChatRow {
  id: string;
  content: string;
  author_name: string | null;
  user_id: string | null;
  anonymous_id: string | null;
  created_at: string;
}

interface ProfileRow { id: string; display_name: string | null; email: string | null; avatar_url: string | null }

const untypedClient = supabase as unknown as SupabaseClient;

type AnonymousClientFactory = (anonymousId: string) => SupabaseClient<Database>;

const createAnonymousClient: AnonymousClientFactory = (anonymousId) =>
  createClient<Database>(ENV_CONFIG.SUPABASE_URL, ENV_CONFIG.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers: { "x-anonymous-id": anonymousId } },
  });

async function hydrate(rows: ChatRow[]): Promise<ChatMessage[]> {
  const ids = Array.from(new Set(rows.map((row) => row.user_id).filter((id): id is string => Boolean(id))));
  const profiles = new Map<string, ProfileRow>();
  if (ids.length) {
    const { data } = await untypedClient.from("profiles").select("id, display_name, email, avatar_url").in("id", ids);
    for (const profile of (data ?? []) as ProfileRow[]) profiles.set(profile.id, profile);
  }
  return rows.map((row) => {
    const profile = row.user_id ? profiles.get(row.user_id) : undefined;
    return {
      id: row.id,
      content: row.content,
      userId: row.user_id,
      anonymousId: row.anonymous_id,
      author: {
        name: profile?.display_name || profile?.email || row.author_name || (row.user_id ? "用户" : "游客"),
        avatarUrl: profile?.avatar_url ?? null,
      },
      createdAt: row.created_at,
    };
  });
}

export class SupabaseChatRepository implements ChatRepository {
  constructor(private readonly anonymousClientFactory: AnonymousClientFactory = createAnonymousClient) {}

  findRecent(limit = 50, before?: string) {
    return withSupabaseError(async () => {
      let query = supabase.from("global_chat_messages").select("*").order("created_at", { ascending: false }).limit(limit);
      if (before) query = query.lt("created_at", before);
      const { data, error } = await query;
      if (error) throw error;
      return hydrate([...(data ?? [])].reverse() as ChatRow[]);
    });
  }

  async send(input: Omit<ChatMessage, "id" | "createdAt">) {
    await withSupabaseError(async () => {
      const client = input.anonymousId ? this.anonymousClientFactory(input.anonymousId) : supabase;
      const { error } = await client.from("global_chat_messages").insert({
        content: input.content,
        author_name: input.author.name,
        user_id: input.userId,
        anonymous_id: input.anonymousId,
      });
      if (error) throw error;
    });
  }

  subscribe(presence: ChatPresence, listener: { onMessage(message: ChatMessage): void; onPresence(items: ChatPresence[]): void }) {
    const channel = supabase.channel("chat:global", { config: { presence: { key: presence.presenceKey } } });
    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "global_chat_messages" }, (payload) => {
        void hydrate([payload.new as ChatRow]).then(([message]) => { if (message) listener.onMessage(message); });
      })
      .on("presence", { event: "sync" }, () => {
        const items: ChatPresence[] = [];
        for (const [presenceKey, values] of Object.entries(channel.presenceState())) {
          const value = values.at(-1) as { userId?: string | null; name?: string; avatarUrl?: string | null } | undefined;
          items.push({
            presenceKey,
            userId: value?.userId ?? null,
            name: value?.name ?? presenceKey.slice(0, 6),
            avatarUrl: value?.avatarUrl ?? null,
          });
        }
        listener.onPresence(items.sort((left, right) => left.name.localeCompare(right.name)));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track({
          userId: presence.userId,
          name: presence.name,
          avatarUrl: presence.avatarUrl,
        });
      });
    return () => { void supabase.removeChannel(channel); };
  }
}
