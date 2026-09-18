import { type LabelHTMLAttributes } from "react";

export function Label({
  className = "",
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`mb-1.5 block px-1 text-[0.8125rem] font-medium text-muted ${className}`}
      {...props}
    />
  );
}
