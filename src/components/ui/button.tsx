import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:bg-accent/90 disabled:bg-accent/40",
  secondary:
    "bg-surface-raised text-foreground border border-border hover:bg-surface-raised/70",
  ghost: "text-foreground hover:bg-surface",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", className = "", ...props }, ref) {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
        {...props}
      />
    );
  },
);
