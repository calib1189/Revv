import type { ChatProvider } from "./chat-provider";
import { MockChatProvider } from "./mock-chat-provider";

/**
 * Swap in a real implementation here once a language model API key is
 * configured. Until then every environment gets the mock.
 */
export function getChatProvider(): ChatProvider {
  return new MockChatProvider();
}
