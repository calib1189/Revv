import type { ChatMessage, ChatProvider, ChatReply } from "./chat-provider";

const MODEL = "gemini-3.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function buildSystemInstruction(context: string): string {
  return (
    "You are the REVV assistant, embedded in an automotive garage-tracking app. " +
    "Answer ONLY using the user's data provided below. If the answer isn't " +
    "contained in that data, say plainly that you don't have that information — " +
    "never invent numbers, parts, specs, or facts. Keep answers short and " +
    "conversational.\n\nUSER DATA:\n" +
    context
  );
}

/**
 * Real chat via the Gemini API, grounded strictly in the context string the
 * caller assembled from the user's own data (see buildUserContext) — the
 * system instruction explicitly forbids answering from anything else.
 * Server only: never import this from client code.
 */
export class GeminiChatProvider implements ChatProvider {
  constructor(private apiKey: string) {}

  async sendMessage(messages: ChatMessage[], context: string): Promise<ChatReply> {
    const res = await fetch(`${ENDPOINT}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemInstruction(context) }],
        },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gemini chat request failed: ${res.status} ${body}`);
    }

    const json = await res.json();
    const text: string | undefined = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini response did not include a reply.");
    }

    return { content: text, isMock: false };
  }
}
