import { type InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`glass-inset h-12 w-full rounded-[14px] px-4 text-foreground placeholder:text-muted transition-[box-shadow,border-color] focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent/15 ${className}`}
      {...props}
    />
  );
});
