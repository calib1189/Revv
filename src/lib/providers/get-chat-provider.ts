import type { ChatProvider } from "./chat-provider";
import { MockChatProvider } from "./mock-chat-provider";
import { GeminiChatProvider } from "./gemini-chat-provider";

/**
 * Real provider when GEMINI_API_KEY is configured, mock otherwise — same
 * pattern as get-vision-provider.
 */
export function getChatProvider(): ChatProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiChatProvider(apiKey);
  return new MockChatProvider();
}
