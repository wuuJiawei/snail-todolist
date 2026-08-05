export interface ChatAuthor {
  name: string;
  avatarUrl: string | null;
}

export interface ChatMessage {
  id: string;
  content: string;
  userId: string | null;
  anonymousId: string | null;
  author: ChatAuthor;
  createdAt: string;
}

export interface ChatPresence {
  presenceKey: string;
  userId: string | null;
  name: string;
  avatarUrl: string | null;
}

export interface ChatRepository {
  findRecent(limit?: number, before?: string): Promise<ChatMessage[]>;
  send(input: Omit<ChatMessage, "id" | "createdAt">): Promise<void>;
  subscribe(
    presence: ChatPresence,
    listener: { onMessage(message: ChatMessage): void; onPresence(items: ChatPresence[]): void },
  ): () => void;
}
