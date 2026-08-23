export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatReply {
  content: string;
  isMock: boolean;
}

export interface ChatProvider {
  /** `context` is a plain-text summary of the user's own data (their
   * vehicles, budget, recent activity) assembled by the caller — the
   * provider never reaches into the database itself. */
  sendMessage(messages: ChatMessage[], context: string): Promise<ChatReply>;
}
