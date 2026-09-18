import type { ReactNode } from "react";

/** The one empty state for the whole app: an optional tinted icon disc,
 * a short title, one line of guidance, and an optional action. Set
 * `card` to put it on a raised surface; leave it off inside a tab or
 * list that already has one. */
export function EmptyState({
  title,
  body,
  icon,
  action,
  card = false,
  className = "",
}: {
  title: string;
  body?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  card?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center px-6 text-center ${
        card ? "glass-raised elev-1 rounded-[28px] py-14" : "py-16"
      } ${className}`}
    >
      {icon && (
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/12 text-accent [&>svg]:h-6 [&>svg]:w-6">
          {icon}
        </span>
      )}
      <p className="text-[1.0625rem] font-semibold tracking-[-0.01em]">{title}</p>
      {body && <p className="mt-1 max-w-xs text-[0.875rem] leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
