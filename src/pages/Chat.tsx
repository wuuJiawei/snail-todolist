import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getOrCreateGuestId } from "@/services/taskService";

type ChatMessage = Tables<"global_chat_messages">;

type NewChatMessage = TablesInsert<"global_chat_messages">;

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString();

const Chat: React.FC = () => {
  const { user, isGuest } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 50;
  const [online, setOnline] = useState<Array<{ key: string; name: string }>>([]);

  const displayName = useMemo(() => {
    if (user) {
      const name = (user.user_metadata as any)?.full_name || user.email || "用户";
      return name as string;
    }
    const gid = getOrCreateGuestId();
    return `游客-${gid.slice(0, 6)}`;
  }, [user]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  };

  useEffect(() => {
    const loadInitial = async () => {
      const { data } = await supabase
        .from("global_chat_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(pageSize);
      const list = (data as ChatMessage[]) || [];
      setMessages([...list].reverse());
      setHasMore(list.length === pageSize);
      scrollToBottom();
    };
    loadInitial();

    const presenceKey = user?.id ?? getOrCreateGuestId();
    const channel = supabase.channel("chat:global", {
      config: { presence: { key: presenceKey } },
    });

    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "global_chat_messages" },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => [...prev, m]);
          scrollToBottom();
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, Array<any>>;
        const members: Array<{ key: string; name: string }> = [];
        Object.entries(state).forEach(([key, arr]) => {
          if (Array.isArray(arr) && arr.length > 0) {
            const last = arr[arr.length - 1];
            members.push({ key, name: last?.name || key.slice(0, 6) });
          }
        });
        members.sort((a, b) => a.name.localeCompare(b.name));
        setOnline(members);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const name = displayName;
          await channel.track({ name });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, displayName]);

  const loadMore = async () => {
    if (loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[0];
    const { data } = await supabase
      .from("global_chat_messages")
      .select("*")
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(pageSize);
    const list = (data as ChatMessage[]) || [];
    const prepend = [...list].reverse();
    setMessages((prev) => [...prepend, ...prev]);
    setHasMore(list.length === pageSize);
    setLoadingMore(false);
  };

  const sendMessage = async () => {
    const content = input.trim();
    if (!content) return;

    const base: NewChatMessage = {
      content,
      author_name: displayName,
    };

    if (user && !isGuest) {
      const payload: NewChatMessage = { ...base, user_id: user.id };
      await supabase.from("global_chat_messages").insert(payload);
    } else {
      const gid = getOrCreateGuestId();
      const payload: NewChatMessage = { ...base, anonymous_id: gid };
      await supabase
        .from("global_chat_messages")
        .insert(payload as any, { headers: { "x-anonymous-id": gid } } as any);
    }

    setInput("");
    scrollToBottom();
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col h-full">
        <div className="h-12 shrink-0 border-b px-4 flex items-center text-sm font-medium">
          全局聊天室
        </div>
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div ref={listRef} className="p-4 space-y-3">
              {hasMore && (
                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? "加载中..." : "加载更多"}
                  </Button>
                </div>
              )}
              {(() => {
                const items: React.ReactNode[] = [];
                let lastDate = "";
                for (const m of messages) {
                  const d = new Date(m.created_at).toLocaleDateString("zh-CN");
                  if (d !== lastDate) {
                    lastDate = d;
                    items.push(
                      <div key={`sep-${d}`} className="flex items-center gap-2 my-2">
                        <div className="flex-1 h-px bg-border" />
                        <div className="text-xs text-muted-foreground whitespace-nowrap">{d}</div>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    );
                  }
                  items.push(
                    <div key={m.id} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs">
                        {m.author_name?.slice(0, 1) || "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium truncate max-w-[160px]">{m.author_name || (m.user_id ? "用户" : "游客")}</span>
                          <span className="text-xs text-muted-foreground">{formatTime(m.created_at)}</span>
                        </div>
                        <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                      </div>
                    </div>
                  );
                }
                items.push(<div key="end" ref={endRef} />);
                return items;
              })()}
            </div>
          </ScrollArea>
        </div>
        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <Textarea
              placeholder="说点什么..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[48px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button onClick={sendMessage} className="h-10 px-4">发送</Button>
          </div>
        </div>
      </div>
      <div className="hidden lg:block w-64 border-l">
        <div className="h-12 shrink-0 border-b px-4 flex items-center text-sm font-medium">在线</div>
        <div className="p-3 space-y-2">
          {online.length === 0 ? (
            <div className="text-xs text-muted-foreground">暂无在线用户</div>
          ) : (
            online.map((m) => (
              <div key={m.key} className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200 flex items-center justify-center text-[10px]">
                  {m.name.slice(0, 1)}
                </div>
                <div className="text-sm truncate">{m.name}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
