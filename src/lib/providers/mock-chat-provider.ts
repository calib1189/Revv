import type { ChatMessage, ChatProvider, ChatReply } from "./chat-provider";

const MOCK_DISCLAIMER =
  "I'm a mock assistant (no real language model is connected) — I can only " +
  "echo back what's in your data for a few keywords like \"budget\", " +
  "\"vehicle\", or \"maintenance\". Ask about one of those, or connect a " +
  "real ChatProvider to get real answers.";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Does no real reasoning — just keyword-matches the user's message against
 * the real context string the caller assembled from their own data, and
 * echoes the relevant part back. Never fabricates numbers; if nothing
 * matches, says so plainly instead of guessing.
 */
export class MockChatProvider implements ChatProvider {
  async sendMessage(
    messages: ChatMessage[],
    context: string,
  ): Promise<ChatReply> {
    await delay(500 + Math.random() * 400);

    const lastMessage = messages[messages.length - 1]?.content.toLowerCase() ?? "";
    const contextLines = context.split("\n").filter(Boolean);

    const keywordMap: [RegExp, string][] = [
      [/budget|spent|spend|cost/, "budget"],
      [/vehicle|car|garage/, "vehicle"],
      [/maintenance|service|oil/, "maintenance"],
    ];

    for (const [pattern, label] of keywordMap) {
      if (pattern.test(lastMessage)) {
        const matchingLines = contextLines.filter((line) =>
          line.toLowerCase().includes(label === "budget" ? "spent" : label),
        );
        if (matchingLines.length > 0) {
          return {
            content: `From your data:\n${matchingLines.join("\n")}`,
            isMock: true,
          };
        }
      }
    }

    return { content: MOCK_DISCLAIMER, isMock: true };
  }
}
