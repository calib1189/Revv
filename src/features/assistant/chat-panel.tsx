"use client";

import { useRef, useState } from "react";
import { sendChatMessageAction } from "@/features/assistant/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChatMessage } from "@/lib/providers/chat-provider";

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const reply = await sendChatMessageAction(nextMessages);
      setMessages((prev) => [...prev, { role: "assistant", content: reply.content }]);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex h-[calc(100dvh-56px-64px-2.5rem)] flex-col">
      <div className="glass flex-1 overflow-y-auto rounded-t-2xl border-b-0 p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">
            Ask about your garage — try &ldquo;what&apos;s my budget&rdquo; or
            &ldquo;how many vehicles do I have&rdquo;.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message, i) => (
              <div
                key={i}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                    message.role === "user"
                      ? "bg-accent text-accent-foreground"
                      : "bg-surface-raised text-foreground"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-surface-raised px-3.5 py-2 text-sm text-muted">
                  Thinking…
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="glass-raised flex gap-2 rounded-b-2xl p-3"
      >
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your garage…"
          disabled={isSending}
        />
        <Button type="submit" disabled={isSending || !input.trim()} className="px-4 py-2.5 text-sm">
          Send
        </Button>
      </form>
    </div>
  );
}
