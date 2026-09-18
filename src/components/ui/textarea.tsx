import { type TextareaHTMLAttributes, forwardRef } from "react";

/** Multi-line companion to Input — same surface, radius and focus ring. */
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = "", ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={`glass-inset w-full rounded-[14px] px-4 py-3 leading-relaxed text-foreground placeholder:text-muted transition-[box-shadow,border-color] focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent/15 ${className}`}
      {...props}
    />
  );
});
