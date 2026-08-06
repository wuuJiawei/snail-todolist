import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchChatMessages, sendChatMessage, subscribeToChat } from "@/data/operations";
import type { ChatMessage, ChatPresence } from "@/data/contracts/chatRepository";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getOrCreateGuestId } from "@/utils/guestId";

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
  const [online, setOnline] = useState<ChatPresence[]>([]);
  const [showNewTip, setShowNewTip] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isAtBottomRef = useRef(true);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const displayName = useMemo(() => {
    if (user) {
      return user.userMetadata.name || user.userMetadata.full_name || user.email || "用户";
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
      const list = await fetchChatMessages(pageSize);
      setMessages(list);
      setHasMore(list.length === pageSize);
      scrollToBottom();
    };
    loadInitial();

    const presenceKey = user?.id ?? getOrCreateGuestId();
    return subscribeToChat({
      presenceKey,
      userId: user?.id ?? null,
      name: displayName,
      avatarUrl: user?.userMetadata.avatar_url ?? null,
    }, {
      onMessage: (m) => {
          const auto = isAtBottomRef.current;
          setMessages((prev) => [...prev, m]);
          if (auto) {
            scrollToBottom();
          } else {
            setShowNewTip(true);
          }
      },
      onPresence: setOnline,
    });
  }, [user, displayName]);

  useEffect(() => {
    const viewport = listRef.current?.parentElement as HTMLDivElement | null;
    if (!viewport) return;
    viewportRef.current = viewport;
    const onScroll = () => {
      const at = viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 40;
      isAtBottomRef.current = at;
      setIsAtBottom(at);
      if (at) setShowNewTip(false);
    };
    onScroll();
    viewport.addEventListener("scroll", onScroll);
    return () => {
      viewport.removeEventListener("scroll", onScroll);
    };
  }, []);

  const loadMore = async () => {
    if (loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[0];
    const list = await fetchChatMessages(pageSize, oldest.createdAt);
    setMessages((prev) => [...list, ...prev]);
    setHasMore(list.length === pageSize);
    setLoadingMore(false);
  };

  const sendMessage = async () => {
    const content = input.trim();
    if (!content) return;

    await sendChatMessage({
      content,
      author: { name: displayName, avatarUrl: user?.userMetadata.avatar_url ?? null },
      userId: user && !isGuest ? user.id : null,
      anonymousId: user && !isGuest ? null : getOrCreateGuestId(),
    });

    setInput("");
    if (isAtBottomRef.current) {
      scrollToBottom();
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col h-full">
        <div className="h-12 shrink-0 border-b px-4 flex items-center text-sm font-medium">
          全局聊天室
        </div>
        <div className="flex-1 overflow-hidden relative">
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
                  const d = new Date(m.createdAt).toLocaleDateString("zh-CN");
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
                  const isSelf = (user && m.userId === user.id) || (!user && m.anonymousId === getOrCreateGuestId());
                  const avatarUrl = m.author.avatarUrl || (isSelf ? user?.userMetadata.avatar_url || "" : "");
                  const authorName = m.author.name;
                  items.push(
                    <div key={m.id} className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 border">
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback>{authorName.slice(0, 1) || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium truncate max-w-[160px]">{authorName}</span>
                          <span className="text-xs text-muted-foreground">{formatTime(m.createdAt)}</span>
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
          {showNewTip && !isAtBottom && (
            <div className="absolute bottom-4 right-4">
              <Button size="sm" variant="secondary" onClick={scrollToBottom}>有新消息，点击查看</Button>
            </div>
          )}
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
              <div key={m.presenceKey} className="flex items-center gap-2">
                <Avatar className="h-6 w-6 border">
                  <AvatarImage src={m.avatarUrl || ''} />
                  <AvatarFallback>{m.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
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
