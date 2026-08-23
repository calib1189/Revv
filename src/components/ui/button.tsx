import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-foreground shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.25),0_8px_24px_-10px_rgb(255_68_51_/_0.55)] hover:bg-accent/90 disabled:bg-accent/40 disabled:shadow-none",
  secondary:
    "glass text-foreground hover:brightness-125 disabled:opacity-50",
  ghost: "text-foreground hover:bg-white/[0.06]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", className = "", ...props }, ref) {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
        {...props}
      />
    );
  },
);
