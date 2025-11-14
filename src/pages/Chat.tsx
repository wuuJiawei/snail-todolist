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
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("global_chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);
      setMessages((data as ChatMessage[]) || []);
      scrollToBottom();
    };
    load();

    const channel = supabase
      .channel("public:global_chat_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "global_chat_messages" },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => [...prev, m]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
              {messages.map((m) => (
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
              ))}
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
        <div className="p-3 text-xs text-muted-foreground">实时在线列表可后续实现</div>
      </div>
    </div>
  );
};

export default Chat;
