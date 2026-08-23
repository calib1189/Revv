import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { ChatPanel } from "@/features/assistant/chat-panel";

export default async function AssistantPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/assistant");

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-5 sm:px-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">
        REVV Assistant
      </h1>
      <ChatPanel />
    </div>
  );
}
