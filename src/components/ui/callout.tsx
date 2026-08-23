import { type ReactNode } from "react";

type Tone = "danger" | "muted";

const TONE_CLASSES: Record<Tone, string> = {
  danger: "border-danger/30 bg-danger/10 text-danger",
  muted: "glass text-muted",
};

export function Callout({
  tone = "muted",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={`rounded-lg border px-3.5 py-2.5 text-sm ${TONE_CLASSES[tone]}`}
    >
      {children}
    </div>
  );
}
